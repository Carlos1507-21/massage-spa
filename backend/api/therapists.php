<?php
// ============================================
// SANACIÓN CONSCIENTE - Therapists API
// ============================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../models/Therapist.php';
require_once __DIR__ . '/../middleware/Auth.php';

$auth = new Auth();

// Verificar autenticación para operaciones de escritura
if ($_SERVER['REQUEST_METHOD'] !== 'GET' || isset($_GET['available'])) {
    if (!$auth->check()) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit();
    }
}

$therapist = new Therapist();

// Manejar diferentes métodos HTTP
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        handleGet($therapist);
        break;

    case 'POST':
        handlePost($therapist);
        break;

    case 'PUT':
        handlePut($therapist);
        break;

    case 'DELETE':
        handleDelete($therapist);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido']);
}

function handleGet($therapist) {
    // Obtener terapeutas disponibles para fecha/hora
    if (isset($_GET['available'])) {
        $date = $_GET['date'] ?? date('Y-m-d');
        $time = $_GET['time'] ?? date('H:i');
        $service = $_GET['service'] ?? null;

        $available = $therapist->getAvailableTherapists($date, $time, $service);
        echo json_encode([
            'success' => true,
            'therapists' => $available,
            'date' => $date,
            'time' => $time
        ]);
        return;
    }

    // Obtener disponibilidad de un terapeuta
    if (isset($_GET['availability'])) {
        $id = $_GET['availability'];
        $availability = $therapist->getAvailability($id);
        echo json_encode([
            'success' => true,
            'availability' => $availability
        ]);
        return;
    }

    // Obtener días no disponibles
    if (isset($_GET['unavailable_days'])) {
        $id = $_GET['unavailable_days'];
        $start = $_GET['start'] ?? null;
        $end = $_GET['end'] ?? null;

        $days = $therapist->getUnavailableDays($id, $start, $end);
        echo json_encode([
            'success' => true,
            'unavailableDays' => $days
        ]);
        return;
    }

    // Obtener estadísticas
    if (isset($_GET['stats'])) {
        $id = $_GET['stats'];
        $start = $_GET['start'] ?? null;
        $end = $_GET['end'] ?? null;

        $stats = $therapist->getStats($id, $start, $end);
        echo json_encode([
            'success' => true,
            'stats' => $stats
        ]);
        return;
    }

    // Obtener un terapeuta específico
    if (isset($_GET['id'])) {
        $data = $therapist->getById($_GET['id']);
        if ($data) {
            echo json_encode(['success' => true, 'therapist' => $data]);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Terapeuta no encontrado']);
        }
        return;
    }

    // Listar todos los terapeutas
    $activeOnly = isset($_GET['active']) && $_GET['active'] === 'true';
    $therapists = $therapist->getAll($activeOnly);
    echo json_encode([
        'success' => true,
        'therapists' => $therapists
    ]);
}

function handlePost($therapist) {
    $input = json_decode(file_get_contents('php://INPUT'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
        return;
    }

    // Crear terapeuta
    if (isset($input['action']) && $input['action'] === 'create') {
        if (empty($input['name'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Nombre es requerido']);
            return;
        }

        $created = $therapist->create($input);

        if ($created) {
            $lastId = $therapist->conn->lastInsertId();
            echo json_encode([
                'success' => true,
                'message' => 'Terapeuta creado exitosamente',
                'id' => $lastId
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al crear']);
        }
        return;
    }

    // Actualizar disponibilidad
    if (isset($input['action']) && $input['action'] === 'update_availability') {
        if (empty($input['therapistId']) || empty($input['availability'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
            return;
        }

        $updated = $therapist->updateAvailability($input['therapistId'], $input['availability']);

        if ($updated) {
            echo json_encode([
                'success' => true,
                'message' => 'Disponibilidad actualizada exitosamente'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar']);
        }
        return;
    }

    // Agregar día no disponible
    if (isset($input['action']) && $input['action'] === 'add_unavailable_day') {
        if (empty($input['therapistId']) || empty($input['date'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Terapeuta y fecha son requeridos']);
            return;
        }

        $added = $therapist->addUnavailableDay($input['therapistId'], $input);

        if ($added) {
            echo json_encode([
                'success' => true,
                'message' => 'Día no disponible agregado exitosamente'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al agregar']);
        }
        return;
    }

    echo json_encode(['success' => false, 'message' => 'Acción no reconocida']);
}

function handlePut($therapist) {
    $input = json_decode(file_get_contents('php://INPUT'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
        return;
    }

    // Actualizar terapeuta
    if (isset($input['action']) && $input['action'] === 'update') {
        if (empty($input['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID es requerido']);
            return;
        }

        $updated = $therapist->update($input['id'], $input);

        if ($updated) {
            echo json_encode([
                'success' => true,
                'message' => 'Terapeuta actualizado exitosamente'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al actualizar']);
        }
        return;
    }

    echo json_encode(['success' => false, 'message' => 'Acción no reconocida']);
}

function handleDelete($therapist) {
    $input = json_decode(file_get_contents('php://INPUT'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
        return;
    }

    // Eliminar terapeuta
    if (isset($input['action']) && $input['action'] === 'delete') {
        if (empty($input['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID es requerido']);
            return;
        }

        $deleted = $therapist->delete($input['id']);

        if ($deleted) {
            echo json_encode([
                'success' => true,
                'message' => 'Terapeuta eliminado exitosamente'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al eliminar']);
        }
        return;
    }

    // Eliminar día no disponible
    if (isset($input['action']) && $input['action'] === 'remove_unavailable_day') {
        if (empty($input['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID es requerido']);
            return;
        }

        $deleted = $therapist->removeUnavailableDay($input['id']);

        if ($deleted) {
            echo json_encode([
                'success' => true,
                'message' => 'Día eliminado exitosamente'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Error al eliminar']);
        }
        return;
    }

    echo json_encode(['success' => false, 'message' => 'Acción no reconocida']);
}
