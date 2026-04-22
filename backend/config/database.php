
<?php
// ============================================
// SANACIÓN CONSCIENTE - Database Configuration
// ============================================

// Configuración de la base de datos
// En producción, usar variables de entorno

define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'sanacion_consciente');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');
define('DB_CHARSET', 'utf8mb4');

// Opciones de conexión PDO
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

// Función para obtener conexión a la base de datos
function getDBConnection() {
    static $pdo = null;

    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $GLOBALS['options']);
        } catch (PDOException $e) {
            throw new Exception("Error de conexión: " . $e->getMessage());
        }
    }

    return $pdo;
}

// Función para inicializar la base de datos
function initDatabase() {
    $sql = "
        CREATE TABLE IF NOT EXISTS reservations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            service VARCHAR(50) NOT NULL,
            reservation_date DATE NOT NULL,
            reservation_time TIME,
            message TEXT,
            status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        -- Migración: agregar columna calendar_event_id si no existe
        SET @exist := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = DATABASE()
            AND table_name = 'reservations'
            AND column_name = 'calendar_event_id');
        SET @sql := IF(@exist = 0,
            'ALTER TABLE reservations ADD COLUMN calendar_event_id VARCHAR(255) NULL AFTER status',
            'SELECT 1');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;

        CREATE TABLE IF NOT EXISTS google_calendar_tokens (
            id INT PRIMARY KEY DEFAULT 1,
            access_token TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            scope TEXT,
            token_type VARCHAR(20) DEFAULT 'Bearer',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        CREATE TABLE IF NOT EXISTS contact_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL,
            subject VARCHAR(200),
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        -- Tabla de horarios de atención
        CREATE TABLE IF NOT EXISTS business_hours (
            id INT AUTO_INCREMENT PRIMARY KEY,
            day_of_week INT NOT NULL COMMENT '0=Domingo, 1=Lunes, ..., 6=Sábado',
            day_name VARCHAR(20) NOT NULL,
            is_open BOOLEAN DEFAULT TRUE,
            open_time TIME,
            close_time TIME,
            break_start TIME,
            break_end TIME,
            slot_duration INT DEFAULT 60 COMMENT 'Duración del slot en minutos',
            max_bookings_per_slot INT DEFAULT 1 COMMENT 'Máximo de reservas por slot',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_day (day_of_week)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

        -- Insertar horarios por defecto (Lunes a Sábado 9:00-19:00, Domingo cerrado)
        INSERT INTO business_hours (day_of_week, day_name, is_open, open_time, close_time, break_start, break_end, slot_duration, max_bookings_per_slot, is_active)
        VALUES
            (0, 'Domingo', FALSE, NULL, NULL, NULL, NULL, 60, 1, TRUE),
            (1, 'Lunes', TRUE, '09:00:00', '19:00:00', '14:00:00', '15:00:00', 60, 1, TRUE),
            (2, 'Martes', TRUE, '09:00:00', '19:00:00', '14:00:00', '15:00:00', 60, 1, TRUE),
            (3, 'Miércoles', TRUE, '09:00:00', '19:00:00', '14:00:00', '15:00:00', 60, 1, TRUE),
            (4, 'Jueves', TRUE, '09:00:00', '19:00:00', '14:00:00', '15:00:00', 60, 1, TRUE),
            (5, 'Viernes', TRUE, '09:00:00', '19:00:00', '14:00:00', '15:00:00', 60, 1, TRUE),
            (6, 'Sábado', TRUE, '10:00:00', '16:00:00', NULL, NULL, 60, 1, TRUE)
        ON DUPLICATE KEY UPDATE day_name = VALUES(day_name);

        -- Tabla de días festivos / horarios especiales
        CREATE TABLE IF NOT EXISTS special_days (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL,
            name VARCHAR(100) NOT NULL COMMENT 'Nombre del día festivo',
            is_open BOOLEAN DEFAULT FALSE,
            open_time TIME,
            close_time TIME,
            break_start TIME,
            break_end TIME,
            notes TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ";

    try {
        $pdo = getDBConnection();
        $pdo->exec($sql);
        return true;
    } catch (PDOException $e) {
        error_log("Error creando tablas: " . $e->getMessage());
        return false;
    }
}
