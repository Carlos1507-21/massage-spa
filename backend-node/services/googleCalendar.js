// ============================================
// SANACIÓN CONSCIENTE - Google Calendar Service
// ============================================

const { google } = require('googleapis');
const { query } = require('../config/database');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3005/backend/api/google-calendar/callback';
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';

// Scopes necesarios para Google Calendar
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Duraciones de servicios en minutos
const SERVICE_DURATIONS = {
    'relajante-espalda': 45,
    'relajante-completo': 60,
    'piedras-espalda': 45,
    'piedras-completo': 60,
    'aromaterapia-espalda': 30,
    'aromaterapia-completo': 45
};

// Nombres legibles de servicios
const SERVICE_NAMES = {
    'relajante-espalda': 'Masaje Relajante (Espalda)',
    'relajante-completo': 'Masaje Relajante (Cuerpo Completo)',
    'piedras-espalda': 'Relajación + Piedras Calientes (Espalda)',
    'piedras-completo': 'Relajación + Piedras Calientes (Cuerpo Completo)',
    'aromaterapia-espalda': 'Aromaterapia (Espalda)',
    'aromaterapia-completo': 'Aromaterapia (Cuerpo Completo)'
};

/**
 * Crear instancia OAuth2 client
 */
function createOAuth2Client() {
    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI
    );
}

/**
 * Obtener URL de autorización de Google
 */
function getAuthUrl() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        throw new Error('Google Calendar credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    }

    const oauth2Client = createOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Forzar para obtener refresh_token
    });
}

/**
 * Intercambiar código de autorización por tokens
 */
async function exchangeCode(code) {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // Guardar tokens en base de datos
    await saveTokens(tokens);

    return tokens;
}

/**
 * Guardar tokens en PostgreSQL
 */
async function saveTokens(tokens) {
    const sql = `
        INSERT INTO google_calendar_tokens (id, access_token, refresh_token, expires_at, scope, token_type, updated_at)
        VALUES (1, $1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id) DO UPDATE SET
            access_token = EXCLUDED.access_token,
            refresh_token = COALESCE(EXCLUDED.refresh_token, google_calendar_tokens.refresh_token),
            expires_at = EXCLUDED.expires_at,
            scope = EXCLUDED.scope,
            token_type = EXCLUDED.token_type,
            updated_at = NOW()
    `;

    const expiresAt = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

    await query(sql, [
        tokens.access_token,
        tokens.refresh_token || '',
        expiresAt,
        tokens.scope || SCOPES.join(' '),
        tokens.token_type || 'Bearer'
    ]);
}

/**
 * Obtener tokens de la base de datos
 */
async function getTokensFromDB() {
    const sql = `SELECT * FROM google_calendar_tokens WHERE id = 1`;
    const result = await query(sql);
    return result.rows[0] || null;
}

/**
 * Obtener cliente OAuth2 autenticado (con refresh automático)
 */
async function getAuthenticatedClient() {
    const tokens = await getTokensFromDB();
    if (!tokens) {
        return null;
    }

    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: new Date(tokens.expires_at).getTime()
    });

    // Refrescar token si está por expirar
    const now = Date.now();
    const expiry = new Date(tokens.expires_at).getTime();
    if (now >= expiry - 5 * 60 * 1000) { // Refrescar si falta menos de 5 min
        try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            await saveTokens(credentials);
            oauth2Client.setCredentials(credentials);
        } catch (err) {
            console.error('Error refreshing Google Calendar token:', err.message);
            return null;
        }
    }

    return oauth2Client;
}

/**
 * Verificar si Google Calendar está conectado
 */
async function isConnected() {
    try {
        const client = await getAuthenticatedClient();
        if (!client) return false;

        // Verificar que el token sea válido haciendo una petición ligera
        const calendar = google.calendar({ version: 'v3', auth: client });
        await calendar.calendarList.list({ maxResults: 1 });
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Calcular fecha/hora de inicio y fin del evento
 */
function getEventTimes(dateStr, timeStr, serviceKey) {
    const durationMinutes = SERVICE_DURATIONS[serviceKey] || 60;

    const startDateTime = new Date(`${dateStr}T${timeStr || '10:00'}`);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

    return {
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString()
    };
}

/**
 * Crear evento en Google Calendar
 */
async function createEvent(reservation) {
    const client = await getAuthenticatedClient();
    if (!client) {
        throw new Error('Google Calendar not connected');
    }

    const serviceName = SERVICE_NAMES[reservation.service] || reservation.service;
    const times = getEventTimes(
        reservation.reservation_date || reservation.date,
        reservation.reservation_time || reservation.time,
        reservation.service
    );

    const event = {
        summary: `[Reserva] ${reservation.name} - ${serviceName}`,
        description: `Cliente: ${reservation.name}\nEmail: ${reservation.email}\nTeléfono: ${reservation.phone}\nServicio: ${serviceName}\n${reservation.message ? `Mensaje: ${reservation.message}` : ''}`,
        start: {
            dateTime: times.start,
            timeZone: 'America/Santiago'
        },
        end: {
            dateTime: times.end,
            timeZone: 'America/Santiago'
        },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 60 },
                { method: 'popup', minutes: 30 }
            ]
        }
    };

    const calendar = google.calendar({ version: 'v3', auth: client });
    const response = await calendar.events.insert({
        calendarId: GOOGLE_CALENDAR_ID,
        requestBody: event
    });

    return response.data.id;
}

/**
 * Actualizar evento en Google Calendar
 */
async function updateEvent(eventId, reservation) {
    const client = await getAuthenticatedClient();
    if (!client) {
        throw new Error('Google Calendar not connected');
    }

    const serviceName = SERVICE_NAMES[reservation.service] || reservation.service;
    const times = getEventTimes(
        reservation.reservation_date || reservation.date,
        reservation.reservation_time || reservation.time,
        reservation.service
    );

    const event = {
        summary: `[Reserva] ${reservation.name} - ${serviceName}`,
        description: `Cliente: ${reservation.name}\nEmail: ${reservation.email}\nTeléfono: ${reservation.phone}\nServicio: ${serviceName}\n${reservation.message ? `Mensaje: ${reservation.message}` : ''}`,
        start: {
            dateTime: times.start,
            timeZone: 'America/Santiago'
        },
        end: {
            dateTime: times.end,
            timeZone: 'America/Santiago'
        }
    };

    const calendar = google.calendar({ version: 'v3', auth: client });
    const response = await calendar.events.patch({
        calendarId: GOOGLE_CALENDAR_ID,
        eventId: eventId,
        requestBody: event
    });

    return response.data.id;
}

/**
 * Eliminar evento de Google Calendar
 */
async function deleteEvent(eventId) {
    const client = await getAuthenticatedClient();
    if (!client) {
        throw new Error('Google Calendar not connected');
    }

    const calendar = google.calendar({ version: 'v3', auth: client });
    await calendar.events.delete({
        calendarId: GOOGLE_CALENDAR_ID,
        eventId: eventId
    });

    return true;
}

/**
 * Desconectar Google Calendar (eliminar tokens)
 */
async function disconnect() {
    const sql = `DELETE FROM google_calendar_tokens WHERE id = 1`;
    await query(sql);
    return true;
}

module.exports = {
    getAuthUrl,
    exchangeCode,
    isConnected,
    createEvent,
    updateEvent,
    deleteEvent,
    disconnect
};
