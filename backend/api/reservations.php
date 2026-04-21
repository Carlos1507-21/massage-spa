
<?php
// ============================================
// SERENITY SPA - Reservations API
// ============================================

require_once __DIR__ . '/../models/Reservation.php';
require_once __DIR__ . '/../models/Email.php';
require_once __DIR__ . '/../models/WhatsApp.php';

// Headers para CORS y JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$reservation = new Reservation();
$method = $_SERVER['REQUEST_METHOD'];
$response = ['success' => false, 'message' => ''];

switch ($method) {
    case 'GET':
        // Obtener reservas
        $status = $_GET['status'] ?? null;
        $id = $_GET['id'] ?? null;

        if ($id) {
            $data = $reservation->getById($id);
            if ($data) {
                $response['success'] = true;
                $response['data'] = $data;
            } else {
                $response['message'] = 'Reserva no encontrada';
                http_response_code(404);
            }
        } else {
            $data = $reservation->getAll($status);
            $response['success'] = true;
            $response['data'] = $data;
        }
        break;

    case 'POST':
        // Crear nueva reserva
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!$data) {
            // Si no es JSON, intentar con POST normal
            $data = $_POST;
        }

        // Validación
        $required = ['name', 'email', 'phone', 'service', 'date'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                $response['message'] = "El campo {$field} es requerido";
                http_response_code(400);
                echo json_encode($response);
                exit();
            }
        }

        // Verificar disponibilidad
        if (!empty($data['time'])) {
            $available = $reservation->checkAvailability($data['date'], $data['time']);
            if (!$available) {
                $response['message'] = 'La hora seleccionada ya no está disponible';
                http_response_code(409);
                echo json_encode($response);
                exit();
            }
        }

        $id = $reservation->create($data);

        if ($id) {
            $response['success'] = true;
            $response['message'] = 'Reserva creada exitosamente';
            $response['id'] = $id;
            http_response_code(201);

            // Enviar email de confirmación al cliente
            $email = new Email();
            $emailResult = $email->sendNewReservation($data);
            $response['email_sent'] = $emailResult['success'];

            // Notificar al admin
            $email->notifyAdminNewReservation($data);
        } else {
            $response['message'] = 'Error al crear la reserva';
            http_response_code(500);
        }
        break;

    case 'PUT':
        // Actualizar reserva
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (empty($data['id']) || empty($data['status'])) {
            $response['message'] = 'ID y status son requeridos';
            http_response_code(400);
            break;
        }

        $validStatuses = ['pending', 'confirmed', 'cancelled'];
        if (!in_array($data['status'], $validStatuses)) {
            $response['message'] = 'Estado no válido';
            http_response_code(400);
            break;
        }

        // Obtener datos de la reserva antes de actualizar (para enviar email)
        $reservationData = $reservation->getById($data['id']);

        $result = $reservation->updateStatus($data['id'], $data['status']);

        if ($result) {
            $response['success'] = true;
            $response['message'] = 'Reserva actualizada';

            // Enviar email según el nuevo estado
            if ($reservationData) {
                $email = new Email();

                if ($data['status'] === 'confirmed') {
                    $email->sendConfirmation($reservationData);
                } elseif ($data['status'] === 'cancelled') {
                    $email->sendCancellation($reservationData);
                }
            }
        } else {
            $response['message'] = 'Error al actualizar';
            http_response_code(500);
        }
        break;

    case 'DELETE':
        // Eliminar reserva
        $id = $_GET['id'] ?? null;

        if (!$id) {
            $response['message'] = 'ID requerido';
            http_response_code(400);
            break;
        }

        $result = $reservation->delete($id);

        if ($result) {
            $response['success'] = true;
            $response['message'] = 'Reserva eliminada';
        } else {
            $response['message'] = 'Error al eliminar';
            http_response_code(500);
        }
        break;

    default:
        $response['message'] = 'Método no permitido';
        http_response_code(405);
        break;
}

echo json_encode($response);
