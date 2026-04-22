<?php
// ============================================
// SANACIÓN CONSCIENTE - Business Hours API
// ============================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../models/BusinessHours.php';
require_once __DIR__ . '/../middleware/Auth.php';

$auth = new Auth();

// Verificar autenticación para todas las operaciones excepto GET público
if ($_SERVER['REQUEST_METHOD'] !== 'GET' || isset($_GET['check'])) {
    if (!$auth->check()) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit();
    }
}

$hours = new BusinessHours();

// Manejar diferentes métodos HTTP
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        handleGet($hours);
        break;

    case 'POST':
        handlePost($hours);
        break;

    case 'PUT':
        handlePut($hours);
        break;

    case 'DELETE':
        handleDelete($hours);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}

function handleGet($hours) {
    // Check de disponibilidad para el frontend público
    if (isset($_GET['check'])) {
        $date = $_GET['date'] ?? date('Y-m-d');
        $time = $_GET['time'] ?? date('H:i');

        $isOpen = $hours->isOpenAt($date, $time);
        echo json_encode([
            'success' => true,
            'isOpen' => $isOpen,
            'date' => $date,
            'time' => $time
        ]);
        return;
    }

    // Obtener slots disponibles
    if (isset($_GET['slots'])) {
        $date = $_GET['date'] ?? date('Y-m-d');
        $duration = $_GET['duration'] ?? 60;

        $slots = $hours->getAvailableSlots($date, $duration);
        echo json_encode([
            'success' => true,
            'slots' => $slots,
            'date' => $date
        ]);
        return;
    }

    // Obtener días festivos
    if (isset($_GET['special_days'])) {
        $start = $_GET['start'] ?? null;
        $end = $_GET['end'] ?? null;

        $days = $hours->getSpecialDays($start, $end);
        echo json_encode([
            'success' => true,
            'specialDays' => $days
        ]);
        return;
    }

    // Obtener todos los horarios
    $allHours = $hours->getAll();
    echo json_encode([
        'success' => true,
        'businessHours' => $allHours,
        'dayNames' => BusinessHours::getDayNames()
    ]);
}

function handlePost($hours) {
    $input = json_decode(file_get_contents('php://INPUT'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
        return;
    }

    // Guardar día festivo
    if (isset($input['action']) && $input['action'] === 'save_special_day') {
        if (empty($input['date']) || empty($input['name'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Fecha y nombre son requeridos']);
            return;
        }

        $saved = $hours->saveSpecialDay($input);

        if ($saved) {
            echo json_encode([
                'success' => true,
                'message' => 'Día festivo guardado exitosamente'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al guardar']);
        }
        return;
    }

    echo json_encode(['success' => false, 'message' => 'Acción no reconocida']);
}

function handlePut($hours) {
    $input = json_decode(file_get_contents('php://INPUT'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
        return;
    }

    // Actualizar horario semanal
    if (isset($input['action']) && $input['action'] === 'update_hours') {
        if (!isset($input['dayOfWeek'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Día de la semana requerido']);
            return;
        }

        $updated = $hours->update($input['dayOfWeek'], $input);

        if ($updated) {
            echo json_encode([
                'success' => true,
                'message' => 'Horario actualizado exitosamente'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar']);
        }
        return;
    }

    // Actualizar día festivo
    if (isset($input['action']) && $input['action'] === 'update_special_day') {
        if (empty($input['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID requerido']);
            return;
        }

        $saved = $hours->saveSpecialDay($input);

        if ($saved) {
            echo json_encode([
                'success' => true,
                'message' => 'Día festivo actualizado exitosamente'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar']);
        }
        return;
    }

    echo json_encode(['success' => false, 'message' => 'Acción no reconocida']);
}

function handleDelete($hours) {
    // Parsear body para DELETE
    $input = json_decode(file_get_contents('php://INPUT'), true);

    if (isset($input['action']) && $input['action'] === 'delete_special_day') {
        if (empty($input['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID requerido']);
            return;
        }

        $deleted = $hours->deleteSpecialDay($input['id']);

        if ($deleted) {
            echo json_encode([
                'success' => true,
                'message' => 'Día festivo eliminado exitosamente'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al eliminar']);
        }
        return;
    }

    echo json_encode(['success' => false, 'message' => 'Acción no reconocida']);
}
