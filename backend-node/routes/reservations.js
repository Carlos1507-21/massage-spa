// ============================================
// SANACIÓN CONSCIENTE - Reservations Routes
// ============================================

const express = require('express');
const router = express.Router();
const Reservation = require('../models/reservation');
const { requireAuth, jsonResponse } = require('../middleware/auth');
const googleCalendarService = require('../services/googleCalendar');

// Duraciones visibles de servicios (minutos)
const SERVICE_DURATIONS = {
    'relajante-espalda': 45,
    'relajante-completo': 60,
    'piedras-espalda': 45,
    'piedras-completo': 60,
    'aromaterapia-espalda': 30,
    'aromaterapia-completo': 45
};

// Helper: sanitizar string básico
function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^\+?56?\s?9\s?\d{4}\s?\d{4}$|^9\d{8}$/.test(phone.replace(/\s/g, ''));
}

function isValidDate(dateStr) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(dateStr).getTime());
}

function isFutureDate(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const input = new Date(dateStr);
    return input >= today;
}

/**
 * GET /backend/api/reservations
 * GET /backend/api/reservations?status=pending
 * GET /backend/api/reservations?id=123
 */
router.get('/', async (req, res) => {
    try {
        const { status, id } = req.query;

        if (id) {
            if (!/^\d+$/.test(id)) {
                return jsonResponse(res, false, 'ID inválido', null, 400);
            }
            const data = await Reservation.getById(parseInt(id));
            if (data) {
                return jsonResponse(res, true, 'Reserva encontrada', data);
            } else {
                return jsonResponse(res, false, 'Reserva no encontrada', null, 404);
            }
        }

        const data = await Reservation.getAll(status || null);
        return jsonResponse(res, true, 'Reservas obtenidas', data);
    } catch (err) {
        console.error('Error en GET /reservations:', err);
        return jsonResponse(res, false, 'Error al obtener reservas', null, 500);
    }
});

/**
 * POST /backend/api/reservations
 */
router.post('/', async (req, res) => {
    try {
        const data = req.body;

        // Validación de campos requeridos
        const required = ['name', 'email', 'phone', 'service', 'date'];
        for (const field of required) {
            if (!data[field] || typeof data[field] !== 'string') {
                return jsonResponse(res, false, `El campo ${field} es requerido`, null, 400);
            }
        }

        // Sanitización y validación
        const name = sanitize(data.name);
        if (name.length < 2 || name.length > 100) {
            return jsonResponse(res, false, 'Nombre debe tener entre 2 y 100 caracteres', null, 400);
        }

        const email = data.email.trim().toLowerCase();
        if (!isValidEmail(email)) {
            return jsonResponse(res, false, 'Email inválido', null, 400);
        }

        const phone = data.phone.trim();
        if (!isValidPhone(phone)) {
            return jsonResponse(res, false, 'Teléfono inválido. Use formato +569XXXXXXXX o 9XXXXXXXX', null, 400);
        }

        if (!isValidDate(data.date)) {
            return jsonResponse(res, false, 'Fecha inválida. Use formato YYYY-MM-DD', null, 400);
        }

        if (!isFutureDate(data.date)) {
            return jsonResponse(res, false, 'La fecha debe ser hoy o futura', null, 400);
        }

        const service = data.service.trim();
        if (!SERVICE_DURATIONS.hasOwnProperty(service)) {
            return jsonResponse(res, false, 'Servicio no válido', null, 400);
        }

        const serviceDuration = SERVICE_DURATIONS[service];

        let message = '';
        if (data.message) {
            message = sanitize(data.message);
            if (message.length > 500) {
                return jsonResponse(res, false, 'Mensaje demasiado largo (máx 500 caracteres)', null, 400);
            }
        }

        let time = null;
        if (data.time) {
            if (!/^\d{2}:\d{2}$/.test(data.time)) {
                return jsonResponse(res, false, 'Hora inválida. Use formato HH:MM', null, 400);
            }
            time = data.time;
        }

        // Preparar datos limpios
        const cleanData = {
            name,
            email,
            phone,
            service,
            service_duration: serviceDuration,
            date: data.date,
            time,
            message
        };

        // Verificar disponibilidad considerando duración + preparación
        if (time) {
            const available = await Reservation.checkAvailability(cleanData.date, time, serviceDuration);
            if (!available) {
                return jsonResponse(res, false, 'La hora seleccionada ya no está disponible', null, 409);
            }
        }

        const id = await Reservation.create(cleanData);

        if (id) {
            const response = {
                success: true,
                message: 'Reserva creada exitosamente',
                id: id
            };

            // Sincronizar con Google Calendar
            try {
                const connected = await googleCalendarService.isConnected();
                if (connected && data.date && data.time) {
                    const eventId = await googleCalendarService.createEvent(data);
                    await Reservation.setCalendarEventId(id, eventId);
                }
            } catch (calErr) {
                console.error('Error sincronizando con Google Calendar:', calErr.message);
                // No fallar la reserva si Google Calendar falla
            }

            return res.status(201).json(response);
        } else {
            return jsonResponse(res, false, 'Error al crear la reserva', null, 500);
        }
    } catch (err) {
        console.error('Error en POST /reservations:', err);
        return jsonResponse(res, false, 'Error al crear reserva', null, 500);
    }
});

/**
 * PUT /backend/api/reservations
 */
router.put('/', requireAuth, async (req, res) => {
    try {
        const { id, status } = req.body;

        if (!id || !status) {
            return jsonResponse(res, false, 'ID y status son requeridos', null, 400);
        }

        if (!/^\d+$/.test(String(id))) {
            return jsonResponse(res, false, 'ID inválido', null, 400);
        }

        const validStatuses = ['pending', 'confirmed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return jsonResponse(res, false, 'Estado no válido', null, 400);
        }

        const result = await Reservation.updateStatus(parseInt(id), status);

        if (result) {
            // Sincronizar con Google Calendar
            try {
                const connected = await googleCalendarService.isConnected();
                if (connected) {
                    const reservation = await Reservation.getById(id);
                    if (reservation) {
                        if (status === 'cancelled' && reservation.calendar_event_id) {
                            await googleCalendarService.deleteEvent(reservation.calendar_event_id);
                            await Reservation.setCalendarEventId(id, null);
                        } else if (status === 'confirmed') {
                            if (reservation.calendar_event_id) {
                                await googleCalendarService.updateEvent(reservation.calendar_event_id, reservation);
                            } else if (reservation.reservation_date && reservation.reservation_time) {
                                const eventId = await googleCalendarService.createEvent(reservation);
                                await Reservation.setCalendarEventId(id, eventId);
                            }
                        }
                    }
                }
            } catch (calErr) {
                console.error('Error sincronizando con Google Calendar:', calErr.message);
                // No fallar si Google Calendar falla
            }

            return jsonResponse(res, true, 'Reserva actualizada');
        } else {
            return jsonResponse(res, false, 'Error al actualizar', null, 500);
        }
    } catch (err) {
        console.error('Error en PUT /reservations:', err);
        return jsonResponse(res, false, 'Error al actualizar reserva', null, 500);
    }
});

/**
 * DELETE /backend/api/reservations?id=123
 */
router.delete('/', requireAuth, async (req, res) => {
    try {
        const { id } = req.query;

        if (!id) {
            return jsonResponse(res, false, 'ID requerido', null, 400);
        }

        if (!/^\d+$/.test(String(id))) {
            return jsonResponse(res, false, 'ID inválido', null, 400);
        }

        const numericId = parseInt(id);
        const reservation = await Reservation.getById(numericId);
        const result = await Reservation.delete(numericId);

        if (result) {
            // Eliminar de Google Calendar si existe
            if (reservation && reservation.calendar_event_id) {
                try {
                    await googleCalendarService.deleteEvent(reservation.calendar_event_id);
                } catch (calErr) {
                    console.error('Error eliminando evento de Google Calendar:', calErr.message);
                }
            }
            return jsonResponse(res, true, 'Reserva eliminada');
        } else {
            return jsonResponse(res, false, 'Error al eliminar', null, 500);
        }
    } catch (err) {
        console.error('Error en DELETE /reservations:', err);
        return jsonResponse(res, false, 'Error al eliminar reserva', null, 500);
    }
});

module.exports = router;
