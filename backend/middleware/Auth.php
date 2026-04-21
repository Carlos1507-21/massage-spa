<?php
// ============================================
// SERENITY SPA - Authentication Middleware
// ============================================

session_start();

class Auth {
    // Usuario admin hardcodeado (en producción usar BD con hash seguro)
    private static $adminUser = [
        'username' => 'admin',
        'password' => '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // bcrypt de "password"
    ];

    // Verificar si está logueado
    public static function check() {
        if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
            return false;
        }
        return true;
    }

    // Login
    public static function login($username, $password) {
        if ($username !== self::$adminUser['username']) {
            return false;
        }

        if (!password_verify($password, self::$adminUser['password'])) {
            return false;
        }

        $_SESSION['admin_logged_in'] = true;
        $_SESSION['admin_username'] = $username;
        $_SESSION['login_time'] = time();

        return true;
    }

    // Logout
    public static function logout() {
        session_destroy();
        return true;
    }

    // Proteger ruta
    public static function requireAuth() {
        if (!self::check()) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'No autorizado']);
            http_response_code(401);
            exit();
        }
    }
}

// Helper para respuestas JSON
function jsonResponse($success, $message = '', $data = null) {
    header('Content-Type: application/json');
    $response = ['success' => $success, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response);
    exit();
}
