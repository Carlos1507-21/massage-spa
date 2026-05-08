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

async function syncReservationWithCalendar(reservationId, data) {
    try {
        const connected = await googleCalendarService.isConnected();
        if (!connected) {
            console.log(`Google Calendar no conectado. Reserva ${reservationId} no se sincronizó.`);
            return;
        }
        if (!data.date || !data.time) {
            console.log(`Reserva ${reservationId} sin fecha/hora. No se sincroniza con Calendar.`);
            return;
        }
        const eventId = await googleCalendarService.createEvent(data);
        await Reservation.setCalendarEventId(reservationId, eventId);
        console.log(`Reserva ${reservationId} sincronizada con Google Calendar. EventId: ${eventId}`);
    } catch (calErr) {
        console.error('Error sincronizando con Google Calendar:', calErr.message);
    }
}

/**
 * GET /backend/api/reservations
 * GET /backend/api/reservations?status=pending
 * GET /backend/api/reservations?id=123
 */
router.get('/', requireAuth, async (req, res) => {
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
        const isAdmin = data.is_admin === true;

        // Validación mínima: nombre siempre requerido
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
            return jsonResponse(res, false, 'El nombre es requerido (mínimo 2 caracteres)', null, 400);
        }

        const name = sanitize(data.name);

        // Para admin: solo nombre es obligatorio, el resto usa defaults
        if (isAdmin) {
            const email = (data.email || 'sin-email@local').trim().toLowerCase();
            const phone = (data.phone || 'Sin teléfono').trim();
            const service = (data.service || 'relajante-completo').trim();
            const serviceDuration = SERVICE_DURATIONS[service] || 60;
            const date = data.date || new Date().toISOString().split('T')[0];
            const time = data.time || '10:00';
            const message = data.message ? sanitize(data.message).substring(0, 500) : '';

            const cleanData = {
                name,
                email,
                phone,
                service,
                service_duration: serviceDuration,
                date,
                time,
                message
            };

            // Precio personalizado desde admin (0 o cualquier valor)
            if (data.price !== undefined && data.price !== null && data.price !== '') {
                const priceNum = parseInt(data.price, 10);
                if (!isNaN(priceNum) && priceNum >= 0) {
                    cleanData.price = priceNum;
                }
            }

            const id = await Reservation.create(cleanData);
            await syncReservationWithCalendar(id, cleanData);
            return jsonResponse(res, true, 'Reserva creada exitosamente', { id });
        }

        // Validación de campos requeridos (solo clientes)
        const required = ['name', 'email', 'phone', 'service', 'date'];
        for (const field of required) {
            if (!data[field] || typeof data[field] !== 'string') {
                return jsonResponse(res, false, `El campo ${field} es requerido`, null, 400);
            }
        }

        if (name.length > 100) {
            return jsonResponse(res, false, 'Nombre debe tener máximo 100 caracteres', null, 400);
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
            await syncReservationWithCalendar(id, cleanData);

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
        const { id, status, price, name, email, phone, service, date, time, message } = req.body;

        if (!id) {
            return jsonResponse(res, false, 'ID es requerido', null, 400);
        }

        if (!/^\d+$/.test(String(id))) {
            return jsonResponse(res, false, 'ID inválido', null, 400);
        }

        const numericId = parseInt(id);
        const reservation = await Reservation.getById(numericId);
        if (!reservation) {
            return jsonResponse(res, false, 'Reserva no encontrada', null, 404);
        }

        // Verificar si hay campos de edición completa
        const hasEditFields = name !== undefined || email !== undefined || phone !== undefined ||
                              service !== undefined || date !== undefined || time !== undefined ||
                              message !== undefined;

        let updated = false;

        if (hasEditFields) {
            const updateData = {};
            if (name !== undefined) updateData.name = sanitize(name);
            if (email !== undefined) updateData.email = email.trim().toLowerCase();
            if (phone !== undefined) updateData.phone = phone.trim();
            if (service !== undefined) {
                const s = service.trim();
                if (!SERVICE_DURATIONS.hasOwnProperty(s)) {
                    return jsonResponse(res, false, 'Servicio no válido', null, 400);
                }
                updateData.service = s;
                updateData.service_duration = SERVICE_DURATIONS[s];
            }
            if (date !== undefined) {
                if (!isValidDate(date)) {
                    return jsonResponse(res, false, 'Fecha inválida', null, 400);
                }
                updateData.reservation_date = date;
            }
            if (time !== undefined) {
                if (time !== null && time !== '' && !/^\d{2}:\d{2}$/.test(time)) {
                    return jsonResponse(res, false, 'Hora inválida', null, 400);
                }
                updateData.reservation_time = time || null;
            }
            if (message !== undefined) updateData.message = message ? sanitize(message).substring(0, 500) : '';

            updated = await Reservation.update(numericId, updateData);
        }

        // Actualizar estado si se proporciona
        if (status) {
            const validStatuses = ['pending', 'confirmed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return jsonResponse(res, false, 'Estado no válido', null, 400);
            }
            const statusUpdated = await Reservation.updateStatus(numericId, status);
            if (statusUpdated) updated = true;
        }

        // Actualizar precio si se proporciona
        if (price !== undefined && price !== null && price !== '') {
            const priceNum = parseInt(price);
            if (!isNaN(priceNum) && priceNum >= 0) {
                await Reservation.updatePrice(numericId, priceNum);
                updated = true;
            }
        }

        if (updated) {
            // Sincronizar con Google Calendar
            try {
                const connected = await googleCalendarService.isConnected();
                if (connected) {
                    const updatedReservation = await Reservation.getById(numericId);
                    if (updatedReservation) {
                        if (status === 'cancelled' && updatedReservation.calendar_event_id) {
                            await googleCalendarService.deleteEvent(updatedReservation.calendar_event_id);
                            await Reservation.setCalendarEventId(numericId, null);
                        } else if (updatedReservation.status === 'confirmed' || updatedReservation.status === 'pending') {
                            if (updatedReservation.calendar_event_id) {
                                await googleCalendarService.updateEvent(updatedReservation.calendar_event_id, updatedReservation);
                            } else if (updatedReservation.reservation_date && updatedReservation.reservation_time) {
                                const eventId = await googleCalendarService.createEvent(updatedReservation);
                                await Reservation.setCalendarEventId(numericId, eventId);
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
            return jsonResponse(res, false, 'No se proporcionaron campos para actualizar', null, 400);
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
