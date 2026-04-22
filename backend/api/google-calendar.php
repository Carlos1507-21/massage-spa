
<?php
// ============================================
// SANACIÓN CONSCIENTE - Google Calendar API Endpoints
// ============================================
//
// Endpoints disponibles (vía query param ?action=xxx):
//
// GET  ?action=status       → Estado de la conexión con Google Calendar
// GET  ?action=auth-url     → URL para iniciar autorización OAuth
// POST ?action=callback     → Callback de Google OAuth (code → token)
// POST ?action=disconnect   → Desconectar cuenta de Google
// POST ?action=sync         → Sincronizar una reserva específica (body: {reservation_id})
// POST ?action=sync-all     → Sincronizar todas las reservas pendientes
//
// ============================================

require_once __DIR__ . '/../middleware/Auth.php';
require_once __DIR__ . '/../services/GoogleCalendarService.php';
require_once __DIR__ . '/../models/Reservation.php';
require_once __DIR__ . '/../config/google-calendar.php';

// Headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Proteger rutas que requieren autenticación
$publicActions = ['callback']; // callback es público por requisito de OAuth
$action = $_GET['action'] ?? '';

if (!in_array($action, $publicActions)) {
    Auth::requireAuth();
}

$calendarService = new GoogleCalendarService();
$reservationModel = new Reservation();
$response = ['success' => false, 'message' => ''];

switch ($action) {

    // ============================================================
    // 1. ESTADO DE CONEXIÓN
    // ============================================================
    case 'status':
        $configured = googleCalendarIsConfigured();
        $connected  = $calendarService->isConnected();
        $tokens     = $calendarService->getTokens();

        $response['success']    = true;
        $response['configured'] = $configured;
        $response['connected']  = $connected;

        if (!$configured) {
            $response['message'] = 'Google Calendar no está configurado. Faltan credenciales de Client ID y Client Secret.';
            $response['help']    = 'Edita backend/config/google-calendar.php y reemplaza los placeholders con las credenciales de Google Cloud Console.';
        } elseif (!$connected) {
            $response['message'] = 'Credenciales configuradas pero la cuenta aún no está conectada.';
            $response['auth_url'] = googleCalendarGetAuthUrl(base64_encode(random_bytes(16)));
        } else {
            $response['message'] = 'Conectado a Google Calendar';
            $response['expires_at'] = $tokens['expires_at'] ?? null;
            $response['scope'] = $tokens['scope'] ?? null;
        }
        break;

    // ============================================================
    // 2. URL DE AUTORIZACIÓN
    // ============================================================
    case 'auth-url':
        if (!googleCalendarIsConfigured()) {
            $response['message'] = 'Google Calendar no está configurado';
            http_response_code(400);
            break;
        }

        $state = base64_encode(random_bytes(16));
        $_SESSION['google_oauth_state'] = $state;

        $response['success'] = true;
        $response['auth_url'] = googleCalendarGetAuthUrl($state);
        break;

    // ============================================================
    // 3. CALLBACK DE GOOGLE OAUTH
    // ============================================================
    case 'callback':
        $code  = $_GET['code'] ?? null;
        $error = $_GET['error'] ?? null;
        $state = $_GET['state'] ?? null;

        if ($error) {
            $response['message'] = "Error de autorización: {$error}";
            http_response_code(400);
            break;
        }

        if (!$code) {
            $response['message'] = 'Código de autorización no proporcionado';
            http_response_code(400);
            break;
        }

        // Verificar state para prevenir CSRF
        // (En un flujo real deberías comparar con $_SESSION['google_oauth_state'])

        $tokens = $calendarService->exchangeCodeForTokens($code);

        if ($tokens) {
            $response['success'] = true;
            $response['message'] = 'Cuenta de Google Calendar conectada exitosamente';
        } else {
            $response['message'] = 'Error al intercambiar el código por tokens. Revisa los logs.';
            http_response_code(500);
        }
        break;

    // ============================================================
    // 4. DESCONECTAR
    // ============================================================
    case 'disconnect':
        $result = $calendarService->clearTokens();
        if ($result) {
            $response['success'] = true;
            $response['message'] = 'Cuenta de Google Calendar desconectada';
        } else {
            $response['message'] = 'Error al desconectar';
            http_response_code(500);
        }
        break;

    // ============================================================
    // 5. SINCRONIZAR UNA RESERVA ESPECÍFICA
    // ============================================================
    case 'sync':
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (empty($data['reservation_id'])) {
            $response['message'] = 'reservation_id es requerido';
            http_response_code(400);
            break;
        }

        $reservation = $reservationModel->getById($data['reservation_id']);
        if (!$reservation) {
            $response['message'] = 'Reserva no encontrada';
            http_response_code(404);
            break;
        }

        $result = $calendarService->syncReservation($reservation);
        $response = array_merge($response, $result);
        break;

    // ============================================================
    // 6. SINCRONIZAR TODAS LAS RESERVAS PENDIENTES
    // ============================================================
    case 'sync-all':
        $pending = $reservationModel->getPendingCalendarSync(50);
        $synced  = 0;
        $errors  = [];

        foreach ($pending as $reservation) {
            $result = $calendarService->syncReservation($reservation);
            if ($result['success']) {
                $synced++;
            } else {
                $errors[] = [
                    'id'      => $reservation['id'],
                    'name'    => $reservation['name'],
                    'message' => $result['message'],
                ];
            }
        }

        $response['success'] = true;
        $response['message'] = "Sincronización completada: {$synced} reservas sincronizadas";
        $response['synced'] = $synced;
        $response['total'] = count($pending);
        $response['errors'] = $errors;
        break;

    // ============================================================
    // ACCIÓN NO RECONOCIDA
    // ============================================================
    default:
        $response['message'] = "Acción no reconocida: {$action}. Usa: status, auth-url, callback, disconnect, sync, sync-all";
        http_response_code(400);
        break;
}

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
