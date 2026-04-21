<?php
// ============================================
// SERENITY SPA - Authentication API
// ============================================

require_once __DIR__ . '/../middleware/Auth.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$action = $_GET['action'] ?? '';
$response = ['success' => false, 'message' => ''];

switch ($action) {
    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $response['message'] = 'Método no permitido';
            http_response_code(405);
            break;
        }

        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!$data) {
            $data = $_POST;
        }

        if (empty($data['username']) || empty($data['password'])) {
            $response['message'] = 'Usuario y contraseña son requeridos';
            http_response_code(400);
            break;
        }

        // Demo mode - aceptar cualquier usuario/contraseña para pruebas
        // En producción usar: Auth::login($data['username'], $data['password'])
        if ($data['username'] === 'admin' && $data['password'] === 'password') {
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['admin_username'] = $data['username'];
            $_SESSION['login_time'] = time();
            $response['success'] = true;
            $response['message'] = 'Login exitoso';
        } else if (Auth::login($data['username'], $data['password'])) {
            $response['success'] = true;
            $response['message'] = 'Login exitoso';
        } else {
            $response['message'] = 'Credenciales incorrectas';
            http_response_code(401);
        }
        break;

    case 'logout':
        Auth::logout();
        $response['success'] = true;
        $response['message'] = 'Logout exitoso';
        break;

    case 'check':
        if (Auth::check()) {
            $response['success'] = true;
            $response['data'] = [
                'username' => $_SESSION['admin_username'] ?? 'admin',
                'login_time' => $_SESSION['login_time'] ?? null
            ];
        } else {
            $response['message'] = 'No autenticado';
            http_response_code(401);
        }
        break;

    default:
        $response['message'] = 'Acción no válida';
        http_response_code(400);
        break;
}

echo json_encode($response);
