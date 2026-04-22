<?php
// ============================================
// SANACIÓN CONSCIENTE - Email Configuration
// ============================================

// Configuración SMTP (para producción)
define('SMTP_HOST', $_ENV['SMTP_HOST'] ?? 'smtp.gmail.com');
define('SMTP_PORT', $_ENV['SMTP_PORT'] ?? 587);
define('SMTP_USER', $_ENV['SMTP_USER'] ?? 'tuemail@gmail.com');
define('SMTP_PASS', $_ENV['SMTP_PASS'] ?? 'tucontraseña');
define('SMTP_SECURE', $_ENV['SMTP_SECURE'] ?? 'tls');

// Configuración del remitente
define('EMAIL_FROM', 'ccarrillo29@gmail.com');
define('EMAIL_NAME', 'Sanación Consciente');
define('EMAIL_REPLY_TO', 'ccarrillo29@gmail.com');
define('ADMIN_EMAIL', 'ccarrillo29@gmail.com'); // Email para notificaciones del admin

// Opciones de notificación
// En desarrollo, puedes desactivar el envío real y solo loggear
$emailConfig = [
    'send_real_emails' => false, // Cambiar a true en producción
    'log_emails' => true,
    'log_path' => __DIR__ . '/../logs/emails.log'
];

// Función auxiliar para loggear emails
function logEmail($to, $subject, $body, $status = 'sent') {
    global $emailConfig;

    if (!$emailConfig['log_emails']) return;

    // Crear directorio de logs si no existe
    $logDir = dirname($emailConfig['log_path']);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }

    $logEntry = sprintf(
        "[%s] Status: %s | To: %s | Subject: %s | Body: %s\n",
        date('Y-m-d H:i:s'),
        $status,
        $to,
        $subject,
        substr(strip_tags($body), 0, 200) . '...'
    );

    file_put_contents($emailConfig['log_path'], $logEntry, FILE_APPEND);
}

// Configuración de plantillas de email
$emailTemplates = [
    'new_reservation' => [
        'subject' => 'Confirmación de Reserva - Sanación Consciente',
        'template' => 'emails/new_reservation.html'
    ],
    'reservation_confirmed' => [
        'subject' => 'Tu reserva ha sido confirmada - Sanación Consciente',
        'template' => 'emails/reservation_confirmed.html'
    ],
    'reservation_reminder' => [
        'subject' => 'Recordatorio de tu cita - Sanación Consciente',
        'template' => 'emails/reservation_reminder.html'
    ],
    'cancellation' => [
        'subject' => 'Reserva cancelada - Sanación Consciente',
        'template' => 'emails/cancellation.html'
    ]
];
