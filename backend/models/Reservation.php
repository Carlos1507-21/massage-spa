
<?php
// ============================================
// SANACIÓN CONSCIENTE - Reservation Model
// ============================================

require_once __DIR__ . '/../config/database.php';

class Reservation {
    private $pdo;

    public function __construct() {
        $this->pdo = getDBConnection();
    }

    // Crear nueva reserva
    public function create($data) {
        $sql = "INSERT INTO reservations (name, email, phone, service, reservation_date, reservation_time, message)
                VALUES (:name, :email, :phone, :service, :reservation_date, :reservation_time, :message)";

        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':name' => $data['name'],
                ':email' => $data['email'],
                ':phone' => $data['phone'],
                ':service' => $data['service'],
                ':reservation_date' => $data['date'],
                ':reservation_time' => $data['time'] ?? null,
                ':message' => $data['message'] ?? null
            ]);

            return $this->pdo->lastInsertId();
        } catch (PDOException $e) {
            error_log("Error creando reserva: " . $e->getMessage());
            return false;
        }
    }

    // Obtener todas las reservas
    public function getAll($status = null) {
        $sql = "SELECT * FROM reservations";

        if ($status) {
            $sql .= " WHERE status = :status";
        }

        $sql .= " ORDER BY reservation_date DESC, reservation_time DESC";

        try {
            $stmt = $this->pdo->prepare($sql);

            if ($status) {
                $stmt->bindParam(':status', $status);
            }

            $stmt->execute();
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Error obteniendo reservas: " . $e->getMessage());
            return [];
        }
    }

    // Obtener reserva por ID
    public function getById($id) {
        $sql = "SELECT * FROM reservations WHERE id = :id";

        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            return $stmt->fetch();
        } catch (PDOException $e) {
            error_log("Error obteniendo reserva: " . $e->getMessage());
            return false;
        }
    }

    // Obtener reservas pendientes de sincronización con Google Calendar
    public function getPendingCalendarSync($limit = 10) {
        $sql = "SELECT * FROM reservations
                WHERE calendar_event_id IS NULL
                AND status IN ('pending', 'confirmed')
                AND reservation_date >= CURDATE()
                ORDER BY reservation_date ASC, reservation_time ASC
                LIMIT :limit";

        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Error obteniendo reservas pendientes de sync: " . $e->getMessage());
            return [];
        }
    }

    // Actualizar estado de reserva
    public function updateStatus($id, $status) {
        $sql = "UPDATE reservations SET status = :status WHERE id = :id";

        try {
            $stmt = $this->pdo->prepare($sql);
            return $stmt->execute([
                ':id' => $id,
                ':status' => $status
            ]);
        } catch (PDOException $e) {
            error_log("Error actualizando reserva: " . $e->getMessage());
            return false;
        }
    }

    // Eliminar reserva
    public function delete($id) {
        $sql = "DELETE FROM reservations WHERE id = :id";

        try {
            $stmt = $this->pdo->prepare($sql);
            return $stmt->execute([':id' => $id]);
        } catch (PDOException $e) {
            error_log("Error eliminando reserva: " . $e->getMessage());
            return false;
        }
    }

    // Verificar disponibilidad
    public function checkAvailability($date, $time) {
        $sql = "SELECT COUNT(*) as count FROM reservations
                WHERE reservation_date = :date
                AND reservation_time = :time
                AND status != 'cancelled'";

        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':date' => $date,
                ':time' => $time
            ]);
            $result = $stmt->fetch();
            return $result['count'] == 0;
        } catch (PDOException $e) {
            error_log("Error verificando disponibilidad: " . $e->getMessage());
            return false;
        }
    }

    // Obtener reservas de mañana que necesitan recordatorio
    public function getTomorrowReservations() {
        $tomorrow = date('Y-m-d', strtotime('+1 day'));

        $sql = "SELECT * FROM reservations
                WHERE reservation_date = :tomorrow
                AND status = 'confirmed'
                AND (reminder_sent IS NULL OR reminder_sent = 0)
                ORDER BY reservation_time ASC";

        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':tomorrow' => $tomorrow]);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Error obteniendo reservas de mañana: " . $e->getMessage());
            return [];
        }
    }

    // Marcar recordatorio como enviado
    public function markReminderSent($id) {
        $sql = "UPDATE reservations SET reminder_sent = 1, reminder_sent_at = NOW() WHERE id = :id";

        try {
            $stmt = $this->pdo->prepare($sql);
            return $stmt->execute([':id' => $id]);
        } catch (PDOException $e) {
            error_log("Error marcando recordatorio: " . $e->getMessage());
            return false;
        }
    }
}
