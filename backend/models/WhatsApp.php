
<?php
// ============================================
// SANACIÓN CONSCIENTE - WhatsApp Integration
// ============================================

class WhatsApp {
    // Número de WhatsApp del spa (en producción, usar variable de entorno)
    private $businessNumber;
    private $businessName = 'Sanación Consciente';

    public function __construct() {
        // Número de WhatsApp del negocio (reemplazar con el real)
        $this->businessNumber = $_ENV['WHATSAPP_NUMBER'] ?? '56912345678';
    }

    /**
     * Generar enlace de WhatsApp para nueva reserva
     */
    public function getReservationLink($service = '', $date = '') {
        $message = $this->buildReservationMessage($service, $date);
        return $this->buildWhatsAppLink($this->businessNumber, $message);
    }

    /**
     * Generar enlace de WhatsApp para consulta general
     */
    public function getGeneralLink($message = '') {
        if (empty($message)) {
            $message = "Hola {$this->businessName}, tengo una consulta:";
        }
        return $this->buildWhatsAppLink($this->businessNumber, $message);
    }

    /**
     * Generar enlace para confirmar reserva existente
     */
    public function getConfirmationLink($reservationData) {
        $message = "Hola {$this->businessName}, confirmo mi reserva:\n\n";
        $message .= "📅 Fecha: {$reservationData['date']}\n";
        $message .= "⏰ Hora: {$reservationData['time']}\n";
        $message .= "👤 Nombre: {$reservationData['name']}\n";
        $message .= "✅ ¡Todo confirmado!";

        return $this->buildWhatsAppLink($this->businessNumber, $message);
    }

    /**
     * Generar enlace para cancelar reserva
     */
    public function getCancellationLink($reservationData) {
        $message = "Hola {$this->businessName}, necesito cancelar mi reserva:\n\n";
        $message .= "📅 Fecha: {$reservationData['date']}\n";
        $message .= "⏰ Hora: {$reservationData['time']}\n";
        $message .= "👤 Nombre: {$reservationData['name']}\n\n";
        $message .= "Por favor confirmen la cancelación. Gracias.";

        return $this->buildWhatsAppLink($this->businessNumber, $message);
    }

    /**
     * Generar enlace para consulta sobre servicio específico
     */
    public function getServiceInquiryLink($serviceCode) {
        $serviceName = $this->getServiceName($serviceCode);
        $price = $this->getServicePrice($serviceCode);

        $message = "Hola {$this->businessName},\n\n";
        $message .= "Me interesa el servicio: {$serviceName}\n";
        $message .= "¿Podrían darme más información sobre:\n";
        $message .= "• Duración de la sesión\n";
        $message .= "• Disponibilidad para esta semana\n";
        $message .= "• Si hay contraindicaciones\n\n";
        $message .= "Gracias!";

        return $this->buildWhatsAppLink($this->businessNumber, $message);
    }

    /**
     * Generar botón HTML flotante de WhatsApp
     */
    public function getFloatingButtonHTML($position = 'right') {
        $link = $this->getGeneralLink();
        $positionStyle = $position === 'left' ? 'left: 20px;' : 'right: 20px;';

        return "
        <a href=\"{$link}\"
           target=\"_blank\"
           class=\"whatsapp-float\"
           style=\"position: fixed;
                  {$positionStyle}
                  bottom: 20px;
                  width: 60px;
                  height: 60px;
                  background: #25d366;
                  color: white;
                  border-radius: 50%;
                  text-align: center;
                  font-size: 30px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                  z-index: 1000;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  text-decoration: none;
                  transition: all 0.3s ease;\"
           aria-label=\"Contactar por WhatsApp\"
        >
            💬
        </a>

        <style>
            .whatsapp-float:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 20px rgba(0,0,0,0.4);
            }
        </style>
        ";
    }

    /**
     * Generar mensaje para compartir reserva
     */
    public function getShareMessage($reservationData) {
        $serviceName = $this->getServiceName($reservationData['service']);

        $message = "🌿 *Reserva en Sanación Consciente*\n\n";
        $message .= "✨ Servicio: {$serviceName}\n";
        $message .= "📅 Fecha: {$reservationData['date']}\n";
        $message .= "⏰ Hora: {$reservationData['time']}\n";
        $message .= "👤 Cliente: {$reservationData['name']}\n\n";
        $message .= "¡Nos vemos pronto! 🙌";

        return $message;
    }

    /**
     * Verificar si el número es válido
     */
    public function validateNumber($number) {
        // Remover todo excepto números
        $cleaned = preg_replace('/[^0-9]/', '', $number);

        // Chile: debe tener 9 dígitos después del código de país
        // Ej: 56912345678 (11 dígitos con código) o 912345678 (9 sin código)
        if (strlen($cleaned) === 9) {
            // Agregar código de país si falta
            return '56' . $cleaned;
        } elseif (strlen($cleaned) === 11 && substr($cleaned, 0, 2) === '56') {
            return $cleaned;
        }

        return false;
    }

    // Métodos privados

    private function buildWhatsAppLink($phone, $message) {
        // Limpiar número
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);

        // Codificar mensaje
        $encodedMessage = urlencode($message);

        return "https://wa.me/{$cleanPhone}?text={$encodedMessage}";
    }

    private function buildReservationMessage($service = '', $date = '') {
        $message = "Hola {$this->businessName},\n\n";
        $message .= "Me gustaría hacer una reserva:\n\n";

        if ($service) {
            $serviceName = $this->getServiceName($service);
            $message .= "🧘 Servicio: {$serviceName}\n";
        } else {
            $message .= "🧘 Servicio: (Por definir)\n";
        }

        if ($date) {
            $message .= "📅 Fecha preferida: {$date}\n";
        }

        $message .= "\n¿Tienen disponibilidad?\n\n";
        $message .= "Gracias!";

        return $message;
    }

    private function getServiceName($code) {
        $services = [
            'relajante' => 'Masaje Relajante',
            'terapeutico' => 'Masaje Terapéutico',
            'aromaterapia' => 'Aromaterapia',
            'piedras' => 'Masaje con Piedras Calientes',
            'reflexologia' => 'Reflexología Podal',
            'prenatal' => 'Masaje Prenatal'
        ];

        return $services[$code] ?? $code;
    }

    private function getServicePrice($code) {
        $prices = [
            'relajante' => '$45.000',
            'terapeutico' => '$55.000',
            'aromaterapia' => '$50.000',
            'piedras' => '$60.000',
            'reflexologia' => '$35.000',
            'prenatal' => '$50.000'
        ];

        return $prices[$code] ?? 'Consultar';
    }
}
