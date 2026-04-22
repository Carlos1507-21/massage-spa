<?php
// ============================================
// SANACIÓN CONSCIENTE - Business Hours Model
// ============================================

require_once __DIR__ . '/../config/database.php';

class BusinessHours {
    private $conn;
    private $table = 'business_hours';

    public function __construct() {
        $this->conn = getDBConnection();
    }

    /**
     * Obtener todos los horarios de la semana
     */
    public function getAll() {
        $query = "SELECT * FROM {$this->table} ORDER BY day_of_week";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Obtener horario por día de la semana
     */
    public function getByDay($dayOfWeek) {
        $query = "SELECT * FROM {$this->table} WHERE day_of_week = ? AND is_active = TRUE";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$dayOfWeek]);
        return $stmt->fetch();
    }

    /**
     * Obtener horario de hoy
     */
    public function getToday() {
        $dayOfWeek = date('w');
        return $this->getByDay($dayOfWeek);
    }

    /**
     * Verificar si el negocio está abierto en un momento específico
     */
    public function isOpenAt($date = null, $time = null) {
        if ($date === null) {
            $date = date('Y-m-d');
        }
        if ($time === null) {
            $time = date('H:i');
        }

        // Verificar si es día festivo
        $specialDay = $this->getSpecialDay($date);
        if ($specialDay) {
            if (!$specialDay['is_open']) {
                return false;
            }
            return $this->isWithinHours($time, $specialDay['open_time'], $specialDay['close_time'], $specialDay['break_start'], $specialDay['break_end']);
        }

        // Verificar horario normal
        $dayOfWeek = date('w', strtotime($date));
        $hours = $this->getByDay($dayOfWeek);

        if (!$hours || !$hours['is_open']) {
            return false;
        }

        return $this->isWithinHours($time, $hours['open_time'], $hours['close_time'], $hours['break_start'], $hours['break_end']);
    }

    /**
     * Verificar si una hora está dentro del horario de atención
     */
    private function isWithinHours($time, $openTime, $closeTime, $breakStart = null, $breakEnd = null) {
        $currentTime = strtotime($time);
        $open = strtotime($openTime);
        $close = strtotime($closeTime);

        // Fuera del horario
        if ($currentTime < $open || $currentTime >= $close) {
            return false;
        }

        // Verificar hora de descanso
        if ($breakStart && $breakEnd) {
            $breakS = strtotime($breakStart);
            $breakE = strtotime($breakEnd);
            if ($currentTime >= $breakS && $currentTime < $breakE) {
                return false;
            }
        }

        return true;
    }

    /**
     * Obtener días festivos
     */
    public function getSpecialDays($startDate = null, $endDate = null) {
        if ($startDate === null) {
            $startDate = date('Y-m-d');
        }
        if ($endDate === null) {
            $endDate = date('Y-m-d', strtotime('+30 days'));
        }

        $query = "SELECT * FROM special_days
                  WHERE date BETWEEN ? AND ?
                  AND is_active = TRUE
                  ORDER BY date";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$startDate, $endDate]);
        return $stmt->fetchAll();
    }

    /**
     * Obtener día festivo específico
     */
    public function getSpecialDay($date) {
        $query = "SELECT * FROM special_days WHERE date = ? AND is_active = TRUE";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$date]);
        return $stmt->fetch();
    }

    /**
     * Obtener slots disponibles para una fecha
     */
    public function getAvailableSlots($date, $serviceDuration = 60) {
        $dayOfWeek = date('w', strtotime($date));
        $hours = $this->getByDay($dayOfWeek);

        // Verificar si es día festivo cerrado
        $specialDay = $this->getSpecialDay($date);
        if ($specialDay && !$specialDay['is_open']) {
            return [];
        }

        // Usar horario especial si existe
        if ($specialDay) {
            $hours = $specialDay;
        }

        if (!$hours || !$hours['is_open']) {
            return [];
        }

        $slots = [];
        $slotDuration = $hours['slot_duration'] ?? 60;
        $openTime = strtotime($hours['open_time']);
        $closeTime = strtotime($hours['close_time']);
        $breakStart = $hours['break_start'] ? strtotime($hours['break_start']) : null;
        $breakEnd = $hours['break_end'] ? strtotime($hours['break_end']) : null;

        $currentTime = $openTime;

        while ($currentTime + ($slotDuration * 60) <= $closeTime) {
            // Saltar hora de descanso
            if ($breakStart && $breakEnd) {
                if ($currentTime >= $breakStart && $currentTime < $breakEnd) {
                    $currentTime = $breakEnd;
                    continue;
                }
                // Saltar si el slot se superpone con el descanso
                if ($currentTime + ($slotDuration * 60) <= $breakEnd && $currentTime < $breakStart) {
                    $currentTime += ($slotDuration * 60);
                    continue;
                }
            }

            $slotTime = date('H:i', $currentTime);

            // Verificar si ya hay reservas en este slot
            $available = $this->checkSlotAvailability($date, $slotTime, $hours['max_bookings_per_slot'] ?? 1);

            if ($available) {
                $slots[] = [
                    'time' => $slotTime,
                    'available' => true,
                    'duration' => $slotDuration
                ];
            }

            $currentTime += ($slotDuration * 60);
        }

        return $slots;
    }

    /**
     * Verificar disponibilidad de un slot específico
     */
    private function checkSlotAvailability($date, $time, $maxBookings) {
        $query = "SELECT COUNT(*) as count FROM reservations
                  WHERE reservation_date = ?
                  AND reservation_time = ?
                  AND status IN ('pending', 'confirmed')";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$date, $time]);
        $result = $stmt->fetch();

        return $result['count'] < $maxBookings;
    }

    /**
     * Actualizar horario
     */
    public function update($dayOfWeek, $data) {
        $query = "UPDATE {$this->table}
                  SET is_open = ?,
                      open_time = ?,
                      close_time = ?,
                      break_start = ?,
                      break_end = ?,
                      slot_duration = ?,
                      max_bookings_per_slot = ?,
                      is_active = ?
                  WHERE day_of_week = ?";

        $stmt = $this->conn->prepare($query);

        return $stmt->execute([
            $data['is_open'] ?? true,
            $data['open_time'] ?? null,
            $data['close_time'] ?? null,
            $data['break_start'] ?? null,
            $data['break_end'] ?? null,
            $data['slot_duration'] ?? 60,
            $data['max_bookings_per_slot'] ?? 1,
            $data['is_active'] ?? true,
            $dayOfWeek
        ]);
    }

    /**
     * Guardar día festivo
     */
    public function saveSpecialDay($data) {
        $query = "INSERT INTO special_days
                  (date, name, is_open, open_time, close_time, break_start, break_end, notes, is_active)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON DUPLICATE KEY UPDATE
                  name = VALUES(name),
                  is_open = VALUES(is_open),
                  open_time = VALUES(open_time),
                  close_time = VALUES(close_time),
                  break_start = VALUES(break_start),
                  break_end = VALUES(break_end),
                  notes = VALUES(notes),
                  is_active = VALUES(is_active)";

        $stmt = $this->conn->prepare($query);

        return $stmt->execute([
            $data['date'],
            $data['name'],
            $data['is_open'] ?? false,
            $data['open_time'] ?? null,
            $data['close_time'] ?? null,
            $data['break_start'] ?? null,
            $data['break_end'] ?? null,
            $data['notes'] ?? null,
            $data['is_active'] ?? true
        ]);
    }

    /**
     * Eliminar día festivo
     */
    public function deleteSpecialDay($id) {
        $query = "DELETE FROM special_days WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute([$id]);
    }

    /**
     * Obtener nombres de días
     */
    public static function getDayNames() {
        return [
            0 => 'Domingo',
            1 => 'Lunes',
            2 => 'Martes',
            3 => 'Miércoles',
            4 => 'Jueves',
            5 => 'Viernes',
            6 => 'Sábado'
        ];
    }
}
