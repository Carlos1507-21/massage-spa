// ============================================
// SANACIÓN CONSCIENTE - Email Service (Node.js)
// ============================================

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configuración SMTP
const SMTP_CONFIG = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: (process.env.SMTP_SECURE || 'tls') === 'ssl',
    auth: {
        user: process.env.SMTP_USER || 'tuemail@gmail.com',
        pass: process.env.SMTP_PASS || 'tucontraseña'
    }
};

const EMAIL_FROM = process.env.EMAIL_FROM || 'masajesanacionasa@gmail.com';
const EMAIL_NAME = process.env.EMAIL_NAME || 'Sanación Consciente ASA';
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || 'masajesanacionasa@gmail.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'masajesanacionasa@gmail.com';
const SEND_REAL_EMAILS = process.env.SEND_REAL_EMAILS === 'true';
const LOG_EMAILS = process.env.LOG_EMAILS !== 'false';
const LOG_PATH = path.join(__dirname, '../logs/emails.log');

// Crear transportador
let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport(SMTP_CONFIG);
    }
    return transporter;
}

// Logger de emails
function logEmail(to, subject, body, status = 'sent') {
    if (!LOG_EMAILS) return;

    const logDir = path.dirname(LOG_PATH);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const logEntry = `[${new Date().toISOString()}] Status: ${status} | To: ${to} | Subject: ${subject} | Body: ${body.replace(/<[^>]*>/g, '').substring(0, 200)}...\n`;
    fs.appendFileSync(LOG_PATH, logEntry);
}

// Función base para enviar emails
async function sendEmail(to, subject, html) {
    logEmail(to, subject, html, 'logged');

    if (!SEND_REAL_EMAILS) {
        console.log(`📧 [DEV] Email logged to ${to}: ${subject}`);
        return { success: true, message: 'Email logged (development mode)', logged: true };
    }

    try {
        const info = await getTransporter().sendMail({
            from: `"${EMAIL_NAME}" <${EMAIL_FROM}>`,
            to,
            replyTo: EMAIL_REPLY_TO,
            subject,
            html
        });

        logEmail(to, subject, html, 'sent');
        return { success: true, message: 'Email sent successfully', messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        logEmail(to, subject, html, 'failed');
        return { success: false, message: error.message };
    }
}

// Formatear nombre de servicio
function formatServiceName(service) {
    const names = {
        'relajante-espalda': 'Masaje Relajante (Espalda) — 45 min · $20.000',
        'relajante-completo': 'Masaje Relajante (Cuerpo Completo) — 60 min · $30.000',
        'piedras-espalda': 'Relajación + Piedras Calientes (Espalda) — 45 min · $30.000',
        'piedras-completo': 'Relajación + Piedras Calientes (Cuerpo Completo) — 60 min · $35.000',
        'aromaterapia-espalda': 'Aromaterapia (Espalda) — 30 min · $25.000',
        'aromaterapia-completo': 'Aromaterapia (Cuerpo Completo) — 45 min · $30.000'
    };
    return names[service] || service;
}

// Formatear fecha
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Generar link de WhatsApp
function getWhatsAppLink(phone, data, isRebooking = false) {
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length === 9 ? '56' + cleanPhone : cleanPhone;
    const serviceName = formatServiceName(data.service);

    let message;
    if (isRebooking) {
        message = `Hola, soy ${data.name}. Me gustaría reagendar mi reserva cancelada del servicio: ${serviceName}. ¿Tienen disponibilidad?`;
    } else {
        message = `Hola, soy ${data.name}. Tengo una reserva para ${serviceName} y quería consultar...`;
    }

    return `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
}

// Templates HTML

function getNewReservationTemplate(data) {
    const serviceName = formatServiceName(data.service);
    const date = formatDate(data.date);
    const time = data.time || 'Por confirmar';
    const whatsappLink = getWhatsAppLink(data.phone, data);

    return `
    <html>
    <head>
        <style>
            body { font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #4CAF7A, #2E7D52); color: white; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-family: 'Playfair Display', serif; }
            .content { padding: 30px; }
            .detail-box { background: #F5FCF6; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { margin: 10px 0; }
            .detail-label { font-weight: bold; color: #4CAF7A; }
            .cta-button { background: #ADEBB3; color: #2c3e50; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 10px 0; font-weight: 600; }
            .footer { background: #f0f0f0; padding: 20px; text-align: center; font-size: 0.9em; color: #666; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>🌿 Sanación Consciente ASA</h1>
                <p>¡Gracias por tu reserva!</p>
            </div>
            <div class='content'>
                <h2>Hola ${data.name},</h2>
                <p>Hemos recibido tu solicitud de reserva. Estamos revisando la disponibilidad y te confirmaremos en breve.</p>
                <div class='detail-box'>
                    <h3>📋 Detalles de tu reserva:</h3>
                    <div class='detail-row'><span class='detail-label'>Servicio:</span> ${serviceName}</div>
                    <div class='detail-row'><span class='detail-label'>Fecha:</span> ${date}</div>
                    <div class='detail-row'><span class='detail-label'>Hora:</span> ${time}</div>
                    ${data.message ? `<div class='detail-row'><span class='detail-label'>Mensaje:</span> ${data.message}</div>` : ''}
                </div>
                <p style='text-align: center;'>
                    <a href='${whatsappLink}' class='cta-button'>📱 Contactar por WhatsApp</a>
                </p>
            </div>
            <div class='footer'>
                <p>📍 Detrás del Mall Quilín, Peñalolén<br>📞 +56 9 1234 5678<br>✉️ masajesanacionasa@gmail.com</p>
                <p><small>Este es un email automático, por favor no respondas a este mensaje.</small></p>
            </div>
        </div>
    </body>
    </html>`;
}

function getConfirmationTemplate(data) {
    const serviceName = formatServiceName(data.service);
    const date = formatDate(data.date);
    const time = data.time || 'Por confirmar';
    const whatsappLink = getWhatsAppLink(data.phone, data);

    return `
    <html>
    <head>
        <style>
            body { font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #4CAF7A, #2E7D52); color: white; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-family: 'Playfair Display', serif; }
            .content { padding: 30px; }
            .confirmation-badge { background: #4CAF7A; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 10px 0; }
            .detail-box { background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF7A; }
            .detail-row { margin: 10px 0; }
            .detail-label { font-weight: bold; color: #4CAF7A; }
            .important-note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
            .cta-button { background: #ADEBB3; color: #2c3e50; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 10px 0; font-weight: 600; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>🌿 Sanación Consciente ASA</h1>
                <div class='confirmation-badge'>✅ Reserva Confirmada</div>
            </div>
            <div class='content'>
                <h2>¡Excelentes noticias ${data.name}!</h2>
                <p>Tu reserva ha sido confirmada. Te esperamos en Sanación Consciente ASA para que disfrutes de una experiencia de relajación única.</p>
                <div class='detail-box'>
                    <h3>📋 Detalles confirmados:</h3>
                    <div class='detail-row'><span class='detail-label'>Servicio:</span> ${serviceName}</div>
                    <div class='detail-row'><span class='detail-label'>Fecha:</span> ${date}</div>
                    <div class='detail-row'><span class='detail-label'>Hora:</span> ${time}</div>
                    <div class='detail-row'><span class='detail-label'>Dirección:</span> Detrás del Mall Quilín, Peñalolén, Santiago</div>
                </div>
                <div class='important-note'>
                    <strong>📋 Recomendaciones para tu visita:</strong>
                    <ul>
                        <li>Llega 10 minutos antes de tu hora</li>
                        <li>Evita comer pesado 1 hora antes del masaje</li>
                        <li>Si necesitas cancelar, avísanos con al menos 24 horas de anticipación</li>
                    </ul>
                </div>
                <p style='text-align: center;'>
                    <a href='${whatsappLink}' class='cta-button'>📱 Contactar por WhatsApp</a>
                </p>
            </div>
        </div>
    </body>
    </html>`;
}

function getCancellationTemplate(data) {
    const serviceName = formatServiceName(data.service);
    const date = formatDate(data.date);
    const whatsappLink = getWhatsAppLink(data.phone, data, true);

    return `
    <html>
    <head>
        <style>
            body { font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: #e74c3c; color: white; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-family: 'Playfair Display', serif; }
            .content { padding: 30px; }
            .detail-box { background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .cta-button { background: #ADEBB3; color: #2c3e50; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 10px 0; font-weight: 600; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>🌿 Sanación Consciente ASA</h1>
                <p>Reserva Cancelada</p>
            </div>
            <div class='content'>
                <h2>Hola ${data.name},</h2>
                <p>Tu reserva ha sido cancelada según lo solicitado.</p>
                <div class='detail-box'>
                    <p><strong>Servicio:</strong> ${serviceName}</p>
                    <p><strong>Fecha:</strong> ${date}</p>
                </div>
                <p>Lamentamos que no puedas asistir. Si deseas reagendar, contáctanos y con gusto te ayudaremos.</p>
                <p style='text-align: center;'>
                    <a href='${whatsappLink}' class='cta-button'>📱 Reagendar por WhatsApp</a>
                </p>
            </div>
        </div>
    </body>
    </html>`;
}

function getAdminNotificationTemplate(data) {
    return `
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #4CAF7A; color: white; padding: 20px; text-align: center;">
                <h2>🌿 Nueva Reserva Recibida</h2>
            </div>
            <div style="background: #f9f9f9; padding: 20px; margin: 20px 0;">
                <h3>Detalles de la reserva:</h3>
                <p><strong>Cliente:</strong> ${data.name}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Teléfono:</strong> ${data.phone}</p>
                <p><strong>Servicio:</strong> ${formatServiceName(data.service)}</p>
                <p><strong>Fecha:</strong> ${formatDate(data.date)}</p>
                <p><strong>Hora:</strong> ${data.time || 'No especificada'}</p>
                ${data.message ? `<p><strong>Mensaje:</strong> ${data.message}</p>` : ''}
            </div>
            <p style="text-align: center;">
                <a href="https://sanacionconsciente.cl/admin" style="background: #4CAF7A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                    Ver en el Panel de Admin
                </a>
            </p>
        </div>
    </body>
    </html>`;
}

// Métodos públicos del servicio

const EmailService = {
    async sendNewReservation(data) {
        const html = getNewReservationTemplate(data);
        return sendEmail(data.email, '✨ Hemos recibido tu reserva - Sanación Consciente ASA', html);
    },

    async sendConfirmation(data) {
        const html = getConfirmationTemplate(data);
        return sendEmail(data.email, '✅ Tu reserva ha sido confirmada - Sanación Consciente ASA', html);
    },

    async sendCancellation(data) {
        const html = getCancellationTemplate(data);
        return sendEmail(data.email, '❌ Tu reserva ha sido cancelada - Sanación Consciente ASA', html);
    },

    async sendReminder(data) {
        const serviceName = formatServiceName(data.service);
        const html = `
        <html>
        <head>
            <style>
                body { font-family: 'Open Sans', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; }
                .header { background: linear-gradient(135deg, #4CAF7A, #2E7D52); color: white; padding: 40px 20px; text-align: center; }
                .content { padding: 30px; }
                .reminder-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>🌿 Sanación Consciente ASA</h1>
                    <p>📅 Recordatorio de Cita</p>
                </div>
                <div class='content'>
                    <h2>Hola ${data.name},</h2>
                    <p>Te recordamos que mañana tienes tu cita en Sanación Consciente ASA.</p>
                    <div class='reminder-box'>
                        <h3>Detalles:</h3>
                        <p><strong>Servicio:</strong> ${serviceName}</p>
                        <p><strong>Hora:</strong> ${data.time || 'hora acordada'}</p>
                        <p><strong>Dirección:</strong> Detrás del Mall Quilín, Peñalolén</p>
                    </div>
                    <p>¡Te esperamos! 🌿</p>
                </div>
            </div>
        </body>
        </html>`;
        return sendEmail(data.email, '📅 Recordatorio: Tu cita es mañana - Sanación Consciente ASA', html);
    },

    async notifyAdminNewReservation(data) {
        const html = getAdminNotificationTemplate(data);
        return sendEmail(ADMIN_EMAIL, '🔔 Nueva reserva recibida - Sanación Consciente ASA', html);
    }
};

module.exports = EmailService;
