// ============================================
// SANACIÓN CONSCIENTE - Google Calendar Routes
// ============================================

const express = require('express');
const router = express.Router();
const googleCalendarService = require('../services/googleCalendar');
const { jsonResponse } = require('../middleware/auth');

/**
 * GET /backend/api/google-calendar/auth
 * Redirige a Google OAuth para autorizar el calendario
 */
router.get('/auth', async (req, res) => {
    try {
        const authUrl = googleCalendarService.getAuthUrl();
        res.redirect(authUrl);
    } catch (err) {
        console.error('Error generating Google auth URL:', err.message);
        return jsonResponse(res, false, 'Error al generar URL de autorización: ' + err.message, null, 500);
    }
});

/**
 * GET /backend/api/google-calendar/callback
 * Callback de Google OAuth - intercambia código por tokens
 */
router.get('/callback', async (req, res) => {
    try {
        const { code, error } = req.query;

        if (error) {
            console.error('Google OAuth error:', error);
            return res.status(400).send(`
                <html><body style="font-family:sans-serif;text-align:center;padding:40px;">
                    <h1 style="color:#e74c3c;">❌ Error de autorización</h1>
                    <p>Google Calendar no pudo ser conectado.</p>
                    <p><strong>Error:</strong> ${error}</p>
                    <a href="/frontend/index.html" style="color:#4CAF7A;">Volver al sitio</a>
                </body></html>
            `);
        }

        if (!code) {
            return res.status(400).send(`
                <html><body style="font-family:sans-serif;text-align:center;padding:40px;">
                    <h1 style="color:#e74c3c;">❌ Código no recibido</h1>
                    <p>No se recibió el código de autorización de Google.</p>
                    <a href="/frontend/index.html" style="color:#4CAF7A;">Volver al sitio</a>
                </body></html>
            `);
        }

        await googleCalendarService.exchangeCode(code);

        res.send(`
            <html><body style="font-family:sans-serif;text-align:center;padding:40px;">
                <h1 style="color:#4CAF7A;">✅ Google Calendar conectado</h1>
                <p>La integración con Google Calendar se ha configurado exitosamente.</p>
                <p>Las reservas se sincronizarán automáticamente con tu calendario.</p>
                <a href="/frontend/index.html" style="color:#4CAF7A;">Volver al sitio</a>
            </body></html>
        `);
    } catch (err) {
        console.error('Error in Google OAuth callback:', err.message);
        res.status(500).send(`
            <html><body style="font-family:sans-serif;text-align:center;padding:40px;">
                <h1 style="color:#e74c3c;">❌ Error al conectar</h1>
                <p>No se pudo completar la conexión con Google Calendar.</p>
                <p><strong>Detalle:</strong> ${err.message}</p>
                <a href="/frontend/index.html" style="color:#4CAF7A;">Volver al sitio</a>
            </body></html>
        `);
    }
});

/**
 * GET /backend/api/google-calendar/status
 * Verifica si Google Calendar está conectado
 */
router.get('/status', async (req, res) => {
    try {
        const connected = await googleCalendarService.isConnected();
        return jsonResponse(res, true, 'Estado de Google Calendar', { connected });
    } catch (err) {
        console.error('Error checking Google Calendar status:', err.message);
        return jsonResponse(res, false, 'Error al verificar estado', { connected: false }, 500);
    }
});

/**
 * POST /backend/api/google-calendar/disconnect
 * Desconecta Google Calendar (elimina tokens)
 */
router.post('/disconnect', async (req, res) => {
    try {
        await googleCalendarService.disconnect();
        return jsonResponse(res, true, 'Google Calendar desconectado exitosamente');
    } catch (err) {
        console.error('Error disconnecting Google Calendar:', err.message);
        return jsonResponse(res, false, 'Error al desconectar', null, 500);
    }
});

module.exports = router;
