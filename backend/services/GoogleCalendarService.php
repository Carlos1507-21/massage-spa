
<?php
// ============================================
// SANACIÓN CONSCIENTE - Google Calendar Service
// ============================================
//
// Servicio para interactuar con la API REST de Google Calendar
// usando cURL (sin dependencias de Composer).
//
// Requiere:
//   - backend/config/google-calendar.php
//   - backend/config/database.php
//
// Flujo de uso típico:
//   1. Verificar si está conectado: $service->isConnected()
//   2. Si no, redirigir a URL de autorización
//   3. Al confirmar reserva, crear evento: $service->createEvent($reservationData)
//   4. Al cancelar, eliminar evento: $service->deleteEvent($eventId)
//
// ============================================

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/google-calendar.php';

class GoogleCalendarService {
    private $pdo;

    public function __construct() {
        $this->pdo = getDBConnection();
    }

    // ============================================================
    // 1. GESTIÓN DE TOKENS EN BASE DE DATOS
    // ============================================================

    /**
     * Guarda los tokens OAuth obtenidos de Google.
     *
     * @param string $accessToken
     * @param string $refreshToken
     * @param int    $expiresIn   Segundos hasta expirar
     * @param string $scope
     * @param string $tokenType
     */
    public function saveTokens($accessToken, $refreshToken, $expiresIn, $scope, $tokenType = 'Bearer') {
        $expiresAt = date('Y-m-d H:i:s', time() + $expiresIn);

        // Usamos REPLACE INTO (o DELETE + INSERT) para mantener un solo registro
        $sql = "REPLACE INTO google_calendar_tokens
                (id, access_token, refresh_token, expires_at, scope, token_type, updated_at)
                VALUES (1, :access_token, :refresh_token, :expires_at, :scope, :token_type, NOW())";

        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':access_token'  => $accessToken,
                ':refresh_token' => $refreshToken,
                ':expires_at'    => $expiresAt,
                ':scope'         => $scope,
                ':token_type'    => $tokenType,
            ]);
            return true;
        } catch (PDOException $e) {
            error_log("Error guardando tokens de Google Calendar: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Obtiene los tokens almacenados.
     */
    public function getTokens() {
        $sql = "SELECT * FROM google_calendar_tokens WHERE id = 1 LIMIT 1";

        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            return $stmt->fetch();
        } catch (PDOException $e) {
            error_log("Error obteniendo tokens: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Elimina los tokens (desconectar cuenta).
     */
    public function clearTokens() {
        $sql = "DELETE FROM google_calendar_tokens WHERE id = 1";

        try {
            $stmt = $this->pdo->prepare($sql);
            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("Error eliminando tokens: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Verifica si existe una conexión activa con Google Calendar.
     */
    public function isConnected() {
        if (!googleCalendarIsConfigured()) {
            return false;
        }
        $tokens = $this->getTokens();
        return !empty($tokens) && !empty($tokens['refresh_token']);
    }

    /**
     * Obtiene un access_token válido (refresca automáticamente si expiró).
     */
    public function getValidAccessToken() {
        $tokens = $this->getTokens();

        if (!$tokens || empty($tokens['refresh_token'])) {
            return false;
        }

        // Si aún no expiró, devolver el access_token actual
        if (strtotime($tokens['expires_at']) > time() + 60) { // margen de 60 seg
            return $tokens['access_token'];
        }

        // Refrescar token
        return $this->refreshAccessToken($tokens['refresh_token']);
    }

    /**
     * Intercambia un authorization_code por tokens de acceso.
     */
    public function exchangeCodeForTokens($code) {
        $postData = [
            'code'          => $code,
            'client_id'     => GOOGLE_CLIENT_ID,
            'client_secret' => GOOGLE_CLIENT_SECRET,
            'redirect_uri'  => GOOGLE_REDIRECT_URI,
            'grant_type'    => 'authorization_code',
        ];

        $response = $this->httpPost(GOOGLE_TOKEN_URL, $postData);

        if (!$response) {
            return false;
        }

        $data = json_decode($response, true);

        if (!empty($data['error'])) {
            error_log("Error OAuth: " . $data['error_description']);
            return false;
        }

        // Guardar tokens
        $this->saveTokens(
            $data['access_token'],
            $data['refresh_token'] ?? '',
            $data['expires_in'],
            $data['scope'],
            $data['token_type']
        );

        return $data;
    }

    /**
     * Refresca el access_token usando el refresh_token.
     */
    private function refreshAccessToken($refreshToken) {
        $postData = [
            'client_id'     => GOOGLE_CLIENT_ID,
            'client_secret' => GOOGLE_CLIENT_SECRET,
            'refresh_token' => $refreshToken,
            'grant_type'    => 'refresh_token',
        ];

        $response = $this->httpPost(GOOGLE_TOKEN_URL, $postData);

        if (!$response) {
            return false;
        }

        $data = json_decode($response, true);

        if (!empty($data['error'])) {
            error_log("Error refrescando token: " . ($data['error_description'] ?? $data['error']));
            // Si el refresh_token es inválido, limpiar tokens
            if ($data['error'] === 'invalid_grant') {
                $this->clearTokens();
            }
            return false;
        }

        // Guardar nuevo access_token (mantener el refresh_token anterior si no viene nuevo)
        $this->saveTokens(
            $data['access_token'],
            $data['refresh_token'] ?? $refreshToken,
            $data['expires_in'],
            $data['scope'],
            $data['token_type']
        );

        return $data['access_token'];
    }

    // ============================================================
    // 2. OPERACIONES CON EVENTOS DE CALENDARIO
    // ============================================================

    /**
     * Crea un evento en Google Calendar para una reserva.
     *
     * @param array $reservation Datos de la reserva (name, email, phone, service, reservation_date, reservation_time, message, id)
     * @return string|false     ID del evento creado, o false en caso de error
     */
    public function createEvent($reservation) {
        $accessToken = $this->getValidAccessToken();
        if (!$accessToken) {
            error_log("Google Calendar: No hay access token válido");
            return false;
        }

        // Construir fecha/hora de inicio y fin (asumimos 1 hora de duración por defecto)
        $date = $reservation['reservation_date'];
        $time = $reservation['reservation_time'] ?? '09:00:00';

        // Asegurar formato correcto
        $startDateTime = $date . 'T' . substr($time, 0, 8); // HH:MM:SS
        $endDateTime   = date('Y-m-d\TH:i:s', strtotime($startDateTime . ' +1 hour'));

        // Duración según servicio (opcional: puedes personalizar)
        $serviceDurations = [
            'Masaje Relajante'      => 60,
            'Masaje Terapeutico'    => 75,
            'Masaje Terapéutico'    => 75,
            'Aromaterapia'          => 60,
            'Piedras Calientes'     => 90,
            'Reflexologia Podal'    => 45,
            'Reflexología Podal'    => 45,
            'Masaje Prenatal'       => 60,
        ];
        $serviceName = $reservation['service'] ?? '';
        $duration = $serviceDurations[$serviceName] ?? 60;
        $endDateTime = date('Y-m-d\TH:i:s', strtotime($startDateTime . " +{$duration} minutes"));

        // Color según estado
        $colorMap = [
            'pending'    => '5',   // Amarillo
            'confirmed'  => '10',  // Verde
            'cancelled'  => '11',  // Rojo
        ];
        $colorId = $colorMap[$reservation['status']] ?? '1';

        $event = [
            'summary'     => '🌿 Reserva: ' . ($reservation['name'] ?? 'Cliente'),
            'description' => $this->buildEventDescription($reservation),
            'start' => [
                'dateTime' => $startDateTime,
                'timeZone' => 'America/Santiago', // Ajustar a tu zona horaria
            ],
            'end' => [
                'dateTime' => $endDateTime,
                'timeZone' => 'America/Santiago',
            ],
            'colorId' => $colorId,
            'reminders' => [
                'useDefault' => false,
                'overrides'  => [
                    ['method' => 'email', 'minutes' => 1440], // 24 horas antes
                    ['method' => 'popup', 'minutes' => 60],  // 1 hora antes
                ],
            ],
        ];

        $url = GOOGLE_CALENDAR_API . '/calendars/' . urlencode(GOOGLE_CALENDAR_ID) . '/events';

        $response = $this->httpPost($url, $event, [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json',
        ]);

        if (!$response) {
            return false;
        }

        $data = json_decode($response, true);

        if (!empty($data['error'])) {
            error_log("Error creando evento en Google Calendar: " . json_encode($data['error']));
            return false;
        }

        // Guardar el ID del evento en la base de datos
        $this->linkEventToReservation($reservation['id'], $data['id']);

        return $data['id'];
    }

    /**
     * Actualiza un evento existente (cambio de estado, hora, etc.).
     */
    public function updateEvent($eventId, $reservation) {
        $accessToken = $this->getValidAccessToken();
        if (!$accessToken) {
            return false;
        }

        $date = $reservation['reservation_date'];
        $time = $reservation['reservation_time'] ?? '09:00:00';
        $startDateTime = $date . 'T' . substr($time, 0, 8);
        $duration = 60; // default
        $endDateTime = date('Y-m-d\TH:i:s', strtotime($startDateTime . " +{$duration} minutes"));

        $colorMap = [
            'pending'    => '5',
            'confirmed'  => '10',
            'cancelled'  => '11',
        ];
        $colorId = $colorMap[$reservation['status']] ?? '1';

        $event = [
            'summary'     => '🌿 Reserva: ' . ($reservation['name'] ?? 'Cliente'),
            'description' => $this->buildEventDescription($reservation),
            'start' => [
                'dateTime' => $startDateTime,
                'timeZone' => 'America/Santiago',
            ],
            'end' => [
                'dateTime' => $endDateTime,
                'timeZone' => 'America/Santiago',
            ],
            'colorId' => $colorId,
        ];

        $url = GOOGLE_CALENDAR_API . '/calendars/' . urlencode(GOOGLE_CALENDAR_ID) . '/events/' . urlencode($eventId);

        $response = $this->httpPut($url, $event, [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json',
        ]);

        if (!$response) {
            return false;
        }

        $data = json_decode($response, true);

        if (!empty($data['error'])) {
            error_log("Error actualizando evento: " . json_encode($data['error']));
            return false;
        }

        return true;
    }

    /**
     * Elimina un evento del calendario.
     */
    public function deleteEvent($eventId) {
        $accessToken = $this->getValidAccessToken();
        if (!$accessToken) {
            return false;
        }

        $url = GOOGLE_CALENDAR_API . '/calendars/' . urlencode(GOOGLE_CALENDAR_ID) . '/events/' . urlencode($eventId);

        return $this->httpDelete($url, [
            'Authorization: Bearer ' . $accessToken,
        ]);
    }

    /**
     * Crea o actualiza el evento de una reserva según corresponda.
     * Útil para llamar automáticamente al confirmar/cambiar una reserva.
     */
    public function syncReservation($reservation) {
        if (!googleCalendarIsConfigured() || !$this->isConnected()) {
            return ['success' => false, 'message' => 'Google Calendar no está configurado o conectado'];
        }

        $eventId = $reservation['calendar_event_id'] ?? null;

        // Si la reserva está cancelada y existe evento, eliminarlo
        if ($reservation['status'] === 'cancelled' && $eventId) {
            $this->deleteEvent($eventId);
            $this->unlinkEventFromReservation($reservation['id']);
            return ['success' => true, 'message' => 'Evento eliminado del calendario'];
        }

        // Si no hay evento, crearlo
        if (!$eventId) {
            $newEventId = $this->createEvent($reservation);
            if ($newEventId) {
                return ['success' => true, 'message' => 'Evento creado en Google Calendar', 'event_id' => $newEventId];
            }
            return ['success' => false, 'message' => 'Error creando evento'];
        }

        // Si existe, actualizarlo
        $updated = $this->updateEvent($eventId, $reservation);
        if ($updated) {
            return ['success' => true, 'message' => 'Evento actualizado en Google Calendar'];
        }

        return ['success' => false, 'message' => 'Error actualizando evento'];
    }

    // ============================================================
    // 3. AUXILIARES
    // ============================================================

    private function buildEventDescription($reservation) {
        $desc = "Cliente: {$reservation['name']}\n";
        $desc .= "Email: {$reservation['email']}\n";
        $desc .= "Teléfono: {$reservation['phone']}\n";
        $desc .= "Servicio: {$reservation['service']}\n";
        $desc .= "Estado: " . ucfirst($reservation['status']) . "\n";

        if (!empty($reservation['message'])) {
            $desc .= "Mensaje: {$reservation['message']}\n";
        }

        $desc .= "\n---\nID Reserva: #{$reservation['id']}\n";
        $desc .= "Sincronizado desde Sanación Consciente Panel Admin";

        return $desc;
    }

    public function linkEventToReservation($reservationId, $eventId) {
        $sql = "UPDATE reservations SET calendar_event_id = :event_id WHERE id = :id";

        try {
            $stmt = $this->pdo->prepare($sql);
            return $stmt->execute([':event_id' => $eventId, ':id' => $reservationId]);
        } catch (PDOException $e) {
            error_log("Error vinculando evento: " . $e->getMessage());
            return false;
        }
    }

    public function unlinkEventFromReservation($reservationId) {
        $sql = "UPDATE reservations SET calendar_event_id = NULL WHERE id = :id";

        try {
            $stmt = $this->pdo->prepare($sql);
            return $stmt->execute([':id' => $reservationId]);
        } catch (PDOException $e) {
            error_log("Error desvinculando evento: " . $e->getMessage());
            return false;
        }
    }

    // ============================================================
    // 4. HTTP HELPERS (cURL)
    // ============================================================

    private function httpPost($url, $data, $headers = []) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, is_string($data) ? $data : json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge(['Content-Type: application/json'], $headers));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        if ($error) {
            error_log("cURL error: " . $error);
            return false;
        }

        if ($httpCode >= 400) {
            error_log("HTTP error {$httpCode}: " . $response);
            // Devolvemos la respuesta para que el caller pueda leer el error
            return $response;
        }

        return $response;
    }

    private function httpPut($url, $data, $headers = []) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge(['Content-Type: application/json'], $headers));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        if ($error) {
            error_log("cURL error (PUT): " . $error);
            return false;
        }

        if ($httpCode >= 400) {
            error_log("HTTP error {$httpCode} (PUT): " . $response);
            return $response;
        }

        return $response;
    }

    private function httpDelete($url, $headers = []) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge(['Content-Type: application/json'], $headers));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        if ($error) {
            error_log("cURL error (DELETE): " . $error);
            return false;
        }

        // 204 = No Content (éxito en DELETE)
        return $httpCode === 204 || $httpCode === 200;
    }
}
