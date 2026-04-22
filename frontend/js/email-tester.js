
// ============================================
// SANACIÓN CONSCIENTE - Email Tester (LocalStorage)
// Para probar sin servidor PHP
// ============================================

// Este archivo permite simular el envío de emails y verlos
// sin necesidad de tener un servidor PHP corriendo

const EmailTester = {
    // Almacén de emails en localStorage
    storageKey: 'sanacion_consciente_emails',

    // Plantillas de emails (copiadas del backend)
    templates: {
        newReservation: (data) => {
            const serviceNames = {
                'relajante': 'Masaje Relajante',
                'terapeutico': 'Masaje Terapéutico',
                'aromaterapia': 'Aromaterapia',
                'piedras': 'Piedras Calientes',
                'reflexologia': 'Reflexología Podal',
                'prenatal': 'Masaje Prenatal'
            };

            return {
                to: data.email,
                subject: '✨ Hemos recibido tu reserva - Sanación Consciente',
                html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
                        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        .header { background: linear-gradient(135deg, #2d5a4a, #1a3d32); color: white; padding: 40px; text-align: center; }
                        .header h1 { margin: 0; }
                        .content { padding: 30px; }
                        .detail-box { background: #faf7f2; padding: 20px; border-radius: 8px; margin: 20px 0; }
                        .detail-row { margin: 10px 0; }
                        .detail-label { font-weight: bold; color: #2d5a4a; }
                        .cta-button { background: #c9a96e; color: #2c3e50; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; margin: 10px 0; font-weight: bold; }
                        .footer { background: #f0f0f0; padding: 20px; text-align: center; font-size: 0.9em; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🌿 Sanación Consciente</h1>
                            <p>¡Gracias por tu reserva!</p>
                        </div>
                        <div class="content">
                            <h2>Hola ${data.name},</h2>
                            <p>Hemos recibido tu solicitud de reserva. Te confirmaremos en breve.</p>

                            <div class="detail-box">
                                <h3>📋 Detalles de tu reserva:</h3>
                                <div class="detail-row">
                                    <span class="detail-label">Servicio:</span> ${serviceNames[data.service] || data.service}
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Fecha:</span> ${data.date}
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Hora:</span> ${data.time || 'Por confirmar'}
                                </div>
                                ${data.message ? `<div class="detail-row"><span class="detail-label">Mensaje:</span> ${data.message}</div>` : ''}
                            </div>

                            <p style="text-align: center;">
                                <a href="https://wa.me/56912345678?text=Hola%20Sanaci%C3%B3n%20Consciente%2C%20soy%20${encodeURIComponent(data.name)}" class="cta-button">📱 Contactar por WhatsApp</a>
                            </p>
                        </div>
                        <div class="footer">
                            <p>📍 Av. Providencia 1234, Santiago<br>
                            📞 +56 9 1234 5678<br>
                            ✉️ reservas@sanacionconsciente.cl</p>
                        </div>
                    </div>
                </body>
                </html>
                `,
                text: `Gracias por tu reserva ${data.name}. Hemos recibido tu solicitud para ${serviceNames[data.service] || data.service} el ${data.date}. Te contactaremos pronto.`
            };
        },

        adminNotification: (data) => {
            const serviceNames = {
                'relajante': 'Masaje Relajante',
                'terapeutico': 'Masaje Terapéutico',
                'aromaterapia': 'Aromaterapia',
                'piedras': 'Piedras Calientes',
                'reflexologia': 'Reflexología Podal',
                'prenatal': 'Masaje Prenatal'
            };

            return {
                to: 'ccarrillo29@gmail.com (Admin)',
                subject: '🔔 Nueva reserva recibida - Sanación Consciente',
                html: `
                <!DOCTYPE html>
                <html>
                <body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <div style="background: #2d5a4a; color: white; padding: 30px; text-align: center;">
                            <h2>🌿 Nueva Reserva Recibida</h2>
                        </div>
                        <div style="padding: 30px;">
                            <h3>Detalles de la reserva:</h3>
                            <p><strong>Cliente:</strong> ${data.name}</p>
                            <p><strong>Email:</strong> ${data.email}</p>
                            <p><strong>Teléfono:</strong> ${data.phone}</p>
                            <p><strong>Servicio:</strong> ${serviceNames[data.service] || data.service}</p>
                            <p><strong>Fecha:</strong> ${data.date}</p>
                            <p><strong>Hora:</strong> ${data.time || 'No especificada'}</p>
                            ${data.message ? `<p><strong>Mensaje:</strong> ${data.message}</p>` : ''}
                        </div>
                    </div>
                </body>
                </html>
                `,
                text: `Nueva reserva de ${data.name} para ${serviceNames[data.service] || data.service} el ${data.date}. Contacto: ${data.phone}`
            };
        }
    },

    // Guardar email en "cola" de envío
    queueEmail: function(type, data) {
        const emails = this.getEmails();
        const template = type === 'admin' ? this.templates.adminNotification(data) : this.templates.newReservation(data);

        const email = {
            id: Date.now(),
            type: type,
            timestamp: new Date().toISOString(),
            status: 'sent',
            ...template
        };

        emails.push(email);
        localStorage.setItem(this.storageKey, JSON.stringify(emails));

        // También agregar a la "bandeja de entrada" del admin
        this.addToInbox(email);

        console.log('✉️ Email guardado:', email.subject);
        return email;
    },

    // Agregar a bandeja de entrada del admin
    addToInbox: function(email) {
        const inboxKey = 'sanacion_consciente_inbox';
        const inbox = JSON.parse(localStorage.getItem(inboxKey) || '[]');
        inbox.unshift({
            id: email.id,
            subject: email.subject,
            from: email.type === 'admin' ? 'Sistema de Reservas' : email.to,
            preview: email.text ? email.text.substring(0, 100) + '...' : 'Ver detalles...',
            html: email.html,
            timestamp: email.timestamp,
            read: false
        });
        // Mantener solo los últimos 50
        if (inbox.length > 50) inbox.pop();
        localStorage.setItem(inboxKey, JSON.stringify(inbox));
    },

    // Obtener todos los emails
    getEmails: function() {
        return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    },

    // Obtener bandeja de entrada
    getInbox: function() {
        return JSON.parse(localStorage.getItem('sanacion_consciente_inbox') || '[]');
    },

    // Marcar como leído
    markAsRead: function(id) {
        const inbox = this.getInbox();
        const email = inbox.find(e => e.id === id);
        if (email) {
            email.read = true;
            localStorage.setItem('sanacion_consciente_inbox', JSON.stringify(inbox));
        }
    },

    // Limpiar todos los emails
    clearAll: function() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem('sanacion_consciente_inbox');
        console.log('🗑️ Todos los emails eliminados');
    },

    // Exportar como archivo
    exportToFile: function() {
        const emails = this.getEmails();
        let content = 'SANACIÓN CONSCIENTE - EMAIL LOG\n';
        content += '========================\n\n';

        emails.forEach(email => {
            content += `[${new Date(email.timestamp).toLocaleString()}]\n`;
            content += `Para: ${email.to}\n`;
            content += `Asunto: ${email.subject}\n`;
            content += `Estado: ${email.status}\n`;
            content += `Tipo: ${email.type}\n`;
            content += '-'.repeat(50) + '\n\n';
        });

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emails-log-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // Simular envío de emails para una reserva
    simulateReservation: function(formData) {
        // Email al cliente
        this.queueEmail('client', formData);

        // Email al admin
        this.queueEmail('admin', formData);

        console.log('📧 Emails simulados enviados:');
        console.log('   1. Confirmación al cliente:', formData.email);
        console.log('   2. Notificación al admin: ccarrillo29@gmail.com');

        return {
            success: true,
            message: 'Reserva creada y emails enviados (modo demo)',
            emailsSent: 2
        };
    }
};

// Exponer globalmente
window.EmailTester = EmailTester;

console.log('📧 EmailTester cargado. Usa EmailTester.simulateReservation(data) para probar.');
