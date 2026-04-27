// ============================================
// SANACIÓN CONSCIENTE - Reservations Routes
// ============================================

const express = require('express');
const router = express.Router();
const Reservation = require('../models/reservation');
const { requireAuth, jsonResponse } = require('../middleware/auth');

/**
 * GET /backend/api/reservations
 * GET /backend/api/reservations?status=pending
 * GET /backend/api/reservations?id=123
 */
router.get('/', async (req, res) => {
    try {
        const { status, id } = req.query;

        if (id) {
            const data = await Reservation.getById(id);
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

        // Validación
        const required = ['name', 'email', 'phone', 'service', 'date'];
        for (const field of required) {
            if (!data[field]) {
                return jsonResponse(res, false, `El campo ${field} es requerido`, null, 400);
            }
        }

        // Verificar disponibilidad
        if (data.time) {
            const available = await Reservation.checkAvailability(data.date, data.time);
            if (!available) {
                return jsonResponse(res, false, 'La hora seleccionada ya no está disponible', null, 409);
            }
        }

        const id = await Reservation.create(data);

        if (id) {
            const response = {
                success: true,
                message: 'Reserva creada exitosamente',
                id: id
            };

            // TODO: Enviar email de confirmación
            // TODO: Notificar al admin
            // TODO: Sincronizar con Google Calendar

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

        const validStatuses = ['pending', 'confirmed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return jsonResponse(res, false, 'Estado no válido', null, 400);
        }

        const result = await Reservation.updateStatus(id, status);

        if (result) {
            // TODO: Enviar email según el nuevo estado
            // TODO: Sincronizar con Google Calendar

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

        const result = await Reservation.delete(id);

        if (result) {
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
