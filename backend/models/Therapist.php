<?php
// ============================================
// SANACIÓN CONSCIENTE - Therapist Model
// ============================================

require_once __DIR__ . '/../config/database.php';

class Therapist {
    private $conn;
    private $table = 'therapists';
    private $table_availability = 'therapist_availability';
    private $table_unavailable_days = 'therapist_unavailable_days';

    public function __construct() {
        $this->conn = getDBConnection();
    }

    /**
     * Obtener todos los terapeutas
     */
    public function getAll($activeOnly = false) {
        $query = "SELECT * FROM {$this->table}";
        if ($activeOnly) {
            $query .= " WHERE is_active = TRUE";
        }
        $query .= " ORDER BY name";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Obtener terapeuta por ID
     */
    public function getById($id) {
        $query = "SELECT * FROM {$this->table} WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    /**
     * Crear nuevo terapeuta
     */
    public function create($data) {
        $query = "INSERT INTO {$this->table}
                  (name, email, phone, specialty, bio, photo_url, is_active, max_daily_appointments)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $this->conn->prepare($query);
        return $stmt->execute([
            $data['name'],
            $data['email'] ?? null,
            $data['phone'] ?? null,
            $data['specialty'] ?? null,
            $data['bio'] ?? null,
            $data['photo_url'] ?? null,
            $data['is_active'] ?? true,
            $data['max_daily_appointments'] ?? 8
        ]);
    }

    /**
     * Actualizar terapeuta
     */
    public function update($id, $data) {
        $query = "UPDATE {$this->table} SET
                  name = ?,
                  email = ?,
                  phone = ?,
                  specialty = ?,
                  bio = ?,
                  photo_url = ?,
                  is_active = ?,
                  max_daily_appointments = ?
                  WHERE id = ?";

        $stmt = $this->conn->prepare($query);
        return $stmt->execute([
            $data['name'],
            $data['email'] ?? null,
            $data['phone'] ?? null,
            $data['specialty'] ?? null,
            $data['bio'] ?? null,
            $data['photo_url'] ?? null,
            $data['is_active'] ?? true,
            $data['max_daily_appointments'] ?? 8,
            $id
        ]);
    }

    /**
     * Eliminar terapeuta
     */
    public function delete($id) {
        $query = "DELETE FROM {$this->table} WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute([$id]);
    }

    /**
     * Obtener disponibilidad semanal de un terapeuta
     */
    public function getAvailability($therapistId) {
        $query = "SELECT * FROM {$this->table_availability}
                  WHERE therapist_id = ?
                  ORDER BY day_of_week";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$therapistId]);
        return $stmt->fetchAll();
    }

    /**
     * Actualizar disponibilidad semanal
     */
    public function updateAvailability($therapistId, $availability) {
        $query = "INSERT INTO {$this->table_availability}
                  (therapist_id, day_of_week, is_available, start_time, end_time, break_start, break_end)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE
                  is_available = VALUES(is_available),
                  start_time = VALUES(start_time),
                  end_time = VALUES(end_time),
                  break_start = VALUES(break_start),
                  break_end = VALUES(break_end)";

        $stmt = $this->conn->prepare($query);

        foreach ($availability as $day) {
            $stmt->execute([
                $therapistId,
                $day['day_of_week'],
                $day['is_available'] ?? false,
                $day['start_time'] ?? null,
                $day['end_time'] ?? null,
                $day['break_start'] ?? null,
                $day['break_end'] ?? null
            ]);
        }

        return true;
    }

    /**
     * Obtener días no disponibles (vacaciones/permisos)
     */
    public function getUnavailableDays($therapistId, $startDate = null, $endDate = null) {
        if ($startDate === null) {
            $startDate = date('Y-m-d');
        }
        if ($endDate === null) {
            $endDate = date('Y-m-d', strtotime('+60 days'));
        }

        $query = "SELECT * FROM {$this->table_unavailable_days}
                  WHERE therapist_id = ?
                  AND date BETWEEN ? AND ?
                  ORDER BY date";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$therapistId, $startDate, $endDate]);
        return $stmt->fetchAll();
    }

    /**
     * Agregar día no disponible
     */
    public function addUnavailableDay($therapistId, $data) {
        $query = "INSERT INTO {$this->table_unavailable_days}
                  (therapist_id, date, reason, is_all_day, start_time, end_time)
                  VALUES (?, ?, ?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE
                  reason = VALUES(reason),
                  is_all_day = VALUES(is_all_day),
                  start_time = VALUES(start_time),
                  end_time = VALUES(end_time)";

        $stmt = $this->conn->prepare($query);
        return $stmt->execute([
            $therapistId,
            $data['date'],
            $data['reason'] ?? null,
            $data['is_all_day'] ?? true,
            $data['start_time'] ?? null,
            $data['end_time'] ?? null
        ]);
    }

    /**
     * Eliminar día no disponible
     */
    public function removeUnavailableDay($id) {
        $query = "DELETE FROM {$this->table_unavailable_days} WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute([$id]);
    }

    /**
     * Verificar si un terapeuta está disponible en una fecha/hora
     */
    public function isAvailableAt($therapistId, $date, $time) {
        // Verificar día no disponible
        $unavailableDay = $this->isDayUnavailable($therapistId, $date, $time);
        if ($unavailableDay) {
            return false;
        }

        // Verificar disponibilidad semanal
        $dayOfWeek = date('w', strtotime($date));
        $availability = $this->getDayAvailability($therapistId, $dayOfWeek);

        if (!$availability || !$availability['is_available']) {
            return false;
        }

        // Verificar hora dentro del rango
        $timeSeconds = strtotime($time);
        $startSeconds = strtotime($availability['start_time']);
        $endSeconds = strtotime($availability['end_time']);

        if ($timeSeconds < $startSeconds || $timeSeconds >= $endSeconds) {
            return false;
        }

        // Verificar no estar en hora de descanso
        if ($availability['break_start'] && $availability['break_end']) {
            $breakStart = strtotime($availability['break_start']);
            $breakEnd = strtotime($availability['break_end']);
            if ($timeSeconds >= $breakStart && $timeSeconds < $breakEnd) {
                return false;
            }
        }

        // Verificar cupo máximo del día
        $dailyCount = $this->getDailyAppointmentCount($therapistId, $date);
        $therapist = $this->getById($therapistId);

        if ($dailyCount >= ($therapist['max_daily_appointments'] ?? 8)) {
            return false;
        }

        return true;
    }

    /**
     * Verificar si un día específico está bloqueado
     */
    private function isDayUnavailable($therapistId, $date, $time = null) {
        $query = "SELECT * FROM {$this->table_unavailable_days}
                  WHERE therapist_id = ?
                  AND date = ?
                  AND is_active = TRUE";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$therapistId, $date]);
        $unavailableDay = $stmt->fetch();

        if (!$unavailableDay) {
            return false;
        }

        // Si es todo el día, no disponible
        if ($unavailableDay['is_all_day']) {
            return true;
        }

        // Si es parcial, verificar hora
        if ($time && $unavailableDay['start_time'] && $unavailableDay['end_time']) {
            $timeSeconds = strtotime($time);
            $startSeconds = strtotime($unavailableDay['start_time']);
            $endSeconds = strtotime($unavailableDay['end_time']);
            return $timeSeconds >= $startSeconds && $timeSeconds < $endSeconds;
        }

        return false;
    }

    /**
     * Obtener disponibilidad de un día específico
     */
    private function getDayAvailability($therapistId, $dayOfWeek) {
        $query = "SELECT * FROM {$this->table_availability}
                  WHERE therapist_id = ? AND day_of_week = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$therapistId, $dayOfWeek]);
        return $stmt->fetch();
    }

    /**
     * Contar citas de un terapeuta en un día
     */
    private function getDailyAppointmentCount($therapistId, $date) {
        $query = "SELECT COUNT(*) as count FROM reservations
                  WHERE therapist_id = ?
                  AND reservation_date = ?
                  AND status IN ('pending', 'confirmed')";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$therapistId, $date]);
        $result = $stmt->fetch();
        return $result['count'];
    }

    /**
     * Obtener terapeutas disponibles para una fecha/hora
     */
    public function getAvailableTherapists($date, $time, $serviceType = null) {
        $therapists = $this->getAll(true);
        $available = [];

        foreach ($therapists as $therapist) {
            if ($this->isAvailableAt($therapist['id'], $date, $time)) {
                // Si se especifica tipo de servicio, verificar especialidad
                if ($serviceType) {
                    $specialties = strtolower($therapist['specialty'] ?? '');
                    if (strpos($specialties, strtolower($serviceType)) !== false) {
                        $available[] = $therapist;
                    }
                } else {
                    $available[] = $therapist;
                }
            }
        }

        return $available;
    }

    /**
     * Obtener estadísticas de un terapeuta
     */
    public function getStats($therapistId, $startDate = null, $endDate = null) {
        if ($startDate === null) {
            $startDate = date('Y-m-01');
        }
        if ($endDate === null) {
            $endDate = date('Y-m-t');
        }

        $query = "SELECT
                  COUNT(*) as total_appointments,
                  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
                  FROM reservations
                  WHERE therapist_id = ?
                  AND reservation_date BETWEEN ? AND ?";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([$therapistId, $startDate, $endDate]);
        return $stmt->fetch();
    }
}
