
<?php
// ============================================
// SERENITY SPA - Email Model
// ============================================

require_once __DIR__ . '/../config/email.php';

class Email {
    private $from;
    private $fromName;
    private $replyTo;

    public function __construct() {
        $this->from = EMAIL_FROM;
        $this->fromName = EMAIL_NAME;
        $this->replyTo = EMAIL_REPLY_TO;
    }

    /**
     * Enviar email de nueva reserva al cliente
     */
    public function sendNewReservation($data) {
        $to = $data['email'];
        $subject = '✨ Hemos recibido tu reserva - Serenity Spa';

        $body = $this->getNewReservationTemplate($data);

        return $this->send($to, $subject, $body);
    }

    /**
     * Enviar email de confirmación al cliente
     */
    public function sendConfirmation($data) {
        $to = $data['email'];
        $subject = '✅ Tu reserva ha sido confirmada - Serenity Spa';

        $body = $this->getConfirmationTemplate($data);

        return $this->send($to, $subject, $body);
    }

    /**
     * Enviar email de cancelación
     */
    public function sendCancellation($data) {
        $to = $data['email'];
        $subject = '❌ Tu reserva ha sido cancelada - Serenity Spa';

        $body = $this->getCancellationTemplate($data);

        return $this->send($to, $subject, $body);
    }

    /**
     * Enviar recordatorio (1 día antes)
     */
    public function sendReminder($data) {
        $to = $data['email'];
        $subject = '📅 Recordatorio: Tu cita es mañana - Serenity Spa';

        $body = $this->getReminderTemplate($data);

        return $this->send($to, $subject, $body);
    }

    /**
     * Notificar al admin de nueva reserva
     */
    public function notifyAdminNewReservation($data) {
        $to = ADMIN_EMAIL ?? 'admin@serenityspa.cl';
        $subject = '🔔 Nueva reserva recibida - Serenity Spa';

        $body = "
        <html>
        <body style=\"font-family: Arial, sans-serif; line-height: 1.6; color: #333;\">
            <div style=\"max-width: 600px; margin: 0 auto; padding: 20px;\">
                <div style=\"background: #2d5a4a; color: white; padding: 20px; text-align: center;\">
                    <h2>🌿 Nueva Reserva Recibida</h2>
                </div>

                <div style=\"background: #f9f9f9; padding: 20px; margin: 20px 0;\">
                    <h3>Detalles de la reserva:</h3>
                    <p><strong>Cliente:</strong> {$data['name']}</p>
                    <p><strong>Email:</strong> {$data['email']}</p>
                    <p><strong>Teléfono:</strong> {$data['phone']}</p>
                    <p><strong>Servicio:</strong> {$this->formatServiceName($data['service'])}</p>
                    <p><strong>Fecha:</strong> {$this->formatDate($data['date'])}</p>
                    <p><strong>Hora:</strong> " . ($data['time'] ?? 'No especificada') . "</p>
                    " . ($data['message'] ? "<p><strong>Mensaje:</strong> {$data['message']}</p>" : "") . "
                </div>

                <p style=\"text-align: center;\">
                    <a href=\"https://serenityspa.cl/admin\" style=\"background: #2d5a4a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;\">
                        Ver en el Panel de Admin
                    </a>
                </p>
            </div>
        </body>
        </html>
        ";

        return $this->send($to, $subject, $body);
    }

    /**
     * Función base para enviar emails
     */
    private function send($to, $subject, $body) {
        global $emailConfig;

        // Headers para HTML
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$this->fromName} <{$this->from}>\r\n";
        $headers .= "Reply-To: {$this->replyTo}\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion();

        // Siempre loggear el email
        logEmail($to, $subject, $body, 'logged');

        // En desarrollo, no enviar email real (solo loggear)
        if (!$emailConfig['send_real_emails']) {
            return [
                'success' => true,
                'message' => 'Email logged (development mode)',
                'logged' => true
            ];
        }

        // Intentar enviar email real
        $sent = mail($to, $subject, $body, $headers);

        if ($sent) {
            logEmail($to, $subject, $body, 'sent');
            return [
                'success' => true,
                'message' => 'Email sent successfully'
            ];
        } else {
            logEmail($to, $subject, $body, 'failed');
            return [
                'success' => false,
                'message' => 'Failed to send email'
            ];
        }
    }

    // Templates HTML para emails

    private function getNewReservationTemplate($data) {
        $serviceName = $this->formatServiceName($data['service']);
        $date = $this->formatDate($data['date']);
        $time = $data['time'] ?? 'Por confirmar';
        $whatsappLink = $this->getWhatsAppLink($data['phone'], $data);

        return "
        <html>
        <head>
            <style>
                body { font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; }
                .header { background: linear-gradient(135deg, #2d5a4a, #1a3d32); color: white; padding: 40px 20px; text-align: center; }
                .header h1 { margin: 0; font-family: 'Playfair Display', serif; }
                .content { padding: 30px; }
                .detail-box { background: #faf7f2; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .detail-row { margin: 10px 0; }
                .detail-label { font-weight: bold; color: #2d5a4a; }
                .cta-button { background: #c9a96e; color: #2c3e50; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 10px 0; font-weight: 600; }
                .footer { background: #f0f0f0; padding: 20px; text-align: center; font-size: 0.9em; color: #666; }
                .social-links { margin: 20px 0; }
                .social-links a { margin: 0 10px; text-decoration: none; font-size: 1.2em; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>🌿 Serenity Spa</h1>
                    <p>¡Gracias por tu reserva!</p>
                </div>

                <div class='content'>
                    <h2>Hola {$data['name']},</h2>
                    <p>Hemos recibido tu solicitud de reserva. Estamos revisando la disponibilidad y te confirmaremos en breve.</p>

                    <div class='detail-box'>
                        <h3>📋 Detalles de tu reserva:</h3>
                        <div class='detail-row'>
                            <span class='detail-label'>Servicio:</span> {$serviceName}
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Fecha:</span> {$date}
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Hora:</span> {$time}
                        </div>
                        " . ($data['message'] ? "
                        <div class='detail-row'>
                            <span class='detail-label'>Mensaje:</span> {$data['message']}
                        </div>
                        " : "") . "
                    </div>

                    <p>Si necesitas modificar o cancelar tu reserva, contáctanos lo antes posible.</p>

                    <p style='text-align: center;'>
                        <a href='{$whatsappLink}' class='cta-button'>📱 Contactar por WhatsApp</a>
                    </p>
                </div>

                <div class='footer'>
                    <p>📍 Av. Providencia 1234, Santiago<br>
                    📞 +56 9 1234 5678<br>
                    ✉️ reservas@serenityspa.cl</p>

                    <div class='social-links'>
                        <a href='#'>📸 Instagram</a> |
                        <a href='#'>📘 Facebook</a> |
                        <a href='#'>💬 WhatsApp</a>
                    </div>

                    <p><small>Este es un email automático, por favor no respondas a este mensaje.</small></p>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    private function getConfirmationTemplate($data) {
        $serviceName = $this->formatServiceName($data['service']);
        $date = $this->formatDate($data['date']);
        $time = $data['time'] ?? 'Por confirmar';
        $whatsappLink = $this->getWhatsAppLink($data['phone'], $data);

        return "
        <html>
        <head>
            <style>
                body { font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; }
                .header { background: linear-gradient(135deg, #27ae60, #2d5a4a); color: white; padding: 40px 20px; text-align: center; }
                .header h1 { margin: 0; font-family: 'Playfair Display', serif; }
                .content { padding: 30px; }
                .confirmation-badge { background: #27ae60; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 10px 0; }
                .detail-box { background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60; }
                .detail-row { margin: 10px 0; }
                .detail-label { font-weight: bold; color: #2d5a4a; }
                .important-note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                .cta-button { background: #c9a96e; color: #2c3e50; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 10px 0; font-weight: 600; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>🌿 Serenity Spa</h1>
                    <div class='confirmation-badge'>✅ Reserva Confirmada</div>
                </div>

                <div class='content'>
                    <h2>¡Excelentes noticias {$data['name']}!</h2>
                    <p>Tu reserva ha sido confirmada. Te esperamos en Serenity Spa para que disfrutes de una experiencia de relajación única.</p>

                    <div class='detail-box'>
                        <h3>📋 Detalles confirmados:</h3>
                        <div class='detail-row'>
                            <span class='detail-label'>Servicio:</span> {$serviceName}
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Fecha:</span> {$date}
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Hora:</span> {$time}
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Dirección:</span> Av. Providencia 1234, Oficina 502, Santiago
                        </div>
                    </div>

                    <div class='important-note'>
                        <strong>📋 Recomendaciones para tu visita:</strong>
                        <ul>
                            <li>Llega 10 minutos antes de tu hora</li>
                            <li>Evita comer pesado 1 hora antes del masaje</li>
                            <li>Si necesitas cancelar, avísanos con al menos 24 horas de anticipación</li>
                        </ul>
                    </div>

                    <p>¿Tienes preguntas? Escríbenos por WhatsApp:</p>

                    <p style='text-align: center;'>
                        <a href='{$whatsappLink}' class='cta-button'>📱 Contactar por WhatsApp</a>
                    </p>

                    <p style='text-align: center; color: #666;'>
                        ¡Nos vemos pronto! 🌿
                    </p>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    private function getCancellationTemplate($data) {
        $serviceName = $this->formatServiceName($data['service']);
        $date = $this->formatDate($data['date']);
        $whatsappLink = $this->getWhatsAppLink($data['phone'], $data, true);

        return "
        <html>
        <head>
            <style>
                body { font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; }
                .header { background: #e74c3c; color: white; padding: 40px 20px; text-align: center; }
                .header h1 { margin: 0; font-family: 'Playfair Display', serif; }
                .content { padding: 30px; }
                .detail-box { background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .cta-button { background: #c9a96e; color: #2c3e50; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 10px 0; font-weight: 600; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>🌿 Serenity Spa</h1>
                    <p>Reserva Cancelada</p>
                </div>

                <div class='content'>
                    <h2>Hola {$data['name']},</h2>
                    <p>Tu reserva ha sido cancelada según lo solicitado.</p>

                    <div class='detail-box'>
                        <p><strong>Servicio:</strong> {$serviceName}</p>
                        <p><strong>Fecha:</strong> {$date}</p>
                    </div>

                    <p>Lamentamos que no puedas asistir. Si deseas reagendar, contáctanos y con gusto te ayudaremos.</p>

                    <p style='text-align: center;'>
                        <a href='{$whatsappLink}' class='cta-button'>📱 Reagendar por WhatsApp</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    private function getReminderTemplate($data) {
        $serviceName = $this->formatServiceName($data['service']);
        $time = $data['time'] ?? 'hora acordada';

        return "
        <html>
        <head>
            <style>
                body { font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; }
                .header { background: linear-gradient(135deg, #3498db, #2d5a4a); color: white; padding: 40px 20px; text-align: center; }
                .content { padding: 30px; }
                .reminder-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>🌿 Serenity Spa</h1>
                    <p>📅 Recordatorio de Cita</p>
                </div>

                <div class='content'>
                    <h2>Hola {$data['name']},</h2>
                    <p>Te recordamos que mañana tienes tu cita en Serenity Spa.</p>

                    <div class='reminder-box'>
                        <h3>Detalles:</h3>
                        <p><strong>Servicio:</strong> {$serviceName}</p>
                        <p><strong>Hora:</strong> {$time}</p>
                        <p><strong>Dirección:</strong> Av. Providencia 1234, Oficina 502</p>
                    </div>

                    <p>¡Te esperamos! 🌿</p>
                </div>
            </div>
        </body>
        </html>
        ";
    }

    // Helpers

    private function formatServiceName($service) {
        $names = [
            'relajante' => 'Masaje Relajante',
            'terapeutico' => 'Masaje Terapéutico',
            'aromaterapia' => 'Aromaterapia',
            'piedras' => 'Masaje con Piedras Calientes',
            'reflexologia' => 'Reflexología Podal',
            'prenatal' => 'Masaje Prenatal'
        ];
        return $names[$service] ?? $service;
    }

    private function formatDate($dateString) {
        if (!$dateString) return '-';
        $date = new DateTime($dateString);
        return $date->format('d \d\e F \d\e Y');
    }

    private function getWhatsAppLink($phone, $data, $isRebooking = false) {
        // Limpiar número de teléfono
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
        // Asegurar que tenga código de país (Chile: +56)
        if (strlen($cleanPhone) === 9) {
            $cleanPhone = '56' . $cleanPhone;
        }

        $serviceName = $this->formatServiceName($data['service']);

        if ($isRebooking) {
            $message = urlencode("Hola, soy {$data['name']}. Me gustaría reagendar mi reserva cancelada del servicio: {$serviceName}. ¿Tienen disponibilidad?");
        } else {
            $message = urlencode("Hola, soy {$data['name']}. Tengo una reserva para {$serviceName} y quería consultar...");
        }

        return "https://wa.me/{$cleanPhone}?text={$message}";
    }
}
