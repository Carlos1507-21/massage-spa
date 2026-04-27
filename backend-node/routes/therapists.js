// ============================================
// SANACIÓN CONSCIENTE - Therapists Routes
// ============================================

const express = require('express');
const router = express.Router();
const Therapist = require('../models/therapist');
const { requireAuth, jsonResponse } = require('../middleware/auth');

/**
 * GET /backend/api/therapists
 * GET /backend/api/therapists?active=true
 * GET /backend/api/therapists?id=123
 * GET /backend/api/therapists?available=1&date=2024-01-01&time=10:00
 * GET /backend/api/therapists?availability=123
 * GET /backend/api/therapists?unavailable_days=123
 * GET /backend/api/therapists?stats=123
 */
router.get('/', async (req, res) => {
    try {
        // Obtener terapeutas disponibles para fecha/hora
        if (req.query.available !== undefined) {
            const date = req.query.date || new Date().toISOString().split('T')[0];
            const time = req.query.time || new Date().toTimeString().slice(0, 5);
            const service = req.query.service || null;

            const available = await Therapist.getAvailableTherapists(date, time, service);
            return jsonResponse(res, true, 'Terapeutas disponibles', {
                therapists: available,
                date,
                time
            });
        }

        // Obtener disponibilidad de un terapeuta
        if (req.query.availability) {
            const availability = await Therapist.getAvailability(req.query.availability);
            return jsonResponse(res, true, 'Disponibilidad obtenida', { availability });
        }

        // Obtener días no disponibles
        if (req.query.unavailable_days) {
            const days = await Therapist.getUnavailableDays(
                req.query.unavailable_days,
                req.query.start || null,
                req.query.end || null
            );
            return jsonResponse(res, true, 'Días no disponibles obtenidos', { unavailableDays: days });
        }

        // Obtener estadísticas
        if (req.query.stats) {
            const stats = await Therapist.getStats(
                req.query.stats,
                req.query.start || null,
                req.query.end || null
            );
            return jsonResponse(res, true, 'Estadísticas obtenidas', { stats });
        }

        // Obtener un terapeuta específico
        if (req.query.id) {
            const data = await Therapist.getById(req.query.id);
            if (data) {
                return jsonResponse(res, true, 'Terapeuta encontrado', { therapist: data });
            } else {
                return jsonResponse(res, false, 'Terapeuta no encontrado', null, 404);
            }
        }

        // Listar todos los terapeutas
        const activeOnly = req.query.active === 'true';
        const therapists = await Therapist.getAll(activeOnly);
        return jsonResponse(res, true, 'Terapeutas obtenidos', { therapists });
    } catch (err) {
        console.error('Error en GET /therapists:', err);
        return jsonResponse(res, false, 'Error al obtener terapeutas', null, 500);
    }
});

/**
 * POST /backend/api/therapists
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const input = req.body;

        if (!input) {
            return jsonResponse(res, false, 'Datos inválidos', null, 400);
        }

        // Crear terapeuta
        if (input.action === 'create') {
            if (!input.name) {
                return jsonResponse(res, false, 'Nombre es requerido', null, 400);
            }

            const id = await Therapist.create(input);

            if (id) {
                return jsonResponse(res, true, 'Terapeuta creado exitosamente', { id });
            } else {
                return jsonResponse(res, false, 'Error al crear', null, 500);
            }
        }

        // Actualizar disponibilidad
        if (input.action === 'update_availability') {
            if (!input.therapistId || !input.availability) {
                return jsonResponse(res, false, 'Datos inválidos', null, 400);
            }

            const updated = await Therapist.updateAvailability(input.therapistId, input.availability);

            if (updated) {
                return jsonResponse(res, true, 'Disponibilidad actualizada exitosamente');
            } else {
                return jsonResponse(res, false, 'Error al actualizar', null, 500);
            }
        }

        // Agregar día no disponible
        if (input.action === 'add_unavailable_day') {
            if (!input.therapistId || !input.date) {
                return jsonResponse(res, false, 'Terapeuta y fecha son requeridos', null, 400);
            }

            const added = await Therapist.addUnavailableDay(input.therapistId, input);

            if (added) {
                return jsonResponse(res, true, 'Día no disponible agregado exitosamente');
            } else {
                return jsonResponse(res, false, 'Error al agregar', null, 500);
            }
        }

        return jsonResponse(res, false, 'Acción no reconocida', null, 400);
    } catch (err) {
        console.error('Error en POST /therapists:', err);
        return jsonResponse(res, false, 'Error al procesar solicitud', null, 500);
    }
});

/**
 * PUT /backend/api/therapists
 */
router.put('/', requireAuth, async (req, res) => {
    try {
        const input = req.body;

        if (!input) {
            return jsonResponse(res, false, 'Datos inválidos', null, 400);
        }

        // Actualizar terapeuta
        if (input.action === 'update') {
            if (!input.id) {
                return jsonResponse(res, false, 'ID es requerido', null, 400);
            }

            const updated = await Therapist.update(input.id, input);

            if (updated) {
                return jsonResponse(res, true, 'Terapeuta actualizado exitosamente');
            } else {
                return jsonResponse(res, false, 'Error al actualizar', null, 500);
            }
        }

        return jsonResponse(res, false, 'Acción no reconocida', null, 400);
    } catch (err) {
        console.error('Error en PUT /therapists:', err);
        return jsonResponse(res, false, 'Error al actualizar terapeuta', null, 500);
    }
});

/**
 * DELETE /backend/api/therapists
 */
router.delete('/', requireAuth, async (req, res) => {
    try {
        const input = req.body;

        if (!input) {
            return jsonResponse(res, false, 'Datos inválidos', null, 400);
        }

        // Eliminar terapeuta
        if (input.action === 'delete') {
            if (!input.id) {
                return jsonResponse(res, false, 'ID es requerido', null, 400);
            }

            const deleted = await Therapist.delete(input.id);

            if (deleted) {
                return jsonResponse(res, true, 'Terapeuta eliminado exitosamente');
            } else {
                return jsonResponse(res, false, 'Error al eliminar', null, 500);
            }
        }

        // Eliminar día no disponible
        if (input.action === 'remove_unavailable_day') {
            if (!input.id) {
                return jsonResponse(res, false, 'ID es requerido', null, 400);
            }

            const deleted = await Therapist.removeUnavailableDay(input.id);

            if (deleted) {
                return jsonResponse(res, true, 'Día eliminado exitosamente');
            } else {
                return jsonResponse(res, false, 'Error al eliminar', null, 500);
            }
        }

        return jsonResponse(res, false, 'Acción no reconocida', null, 400);
    } catch (err) {
        console.error('Error en DELETE /therapists:', err);
        return jsonResponse(res, false, 'Error al eliminar terapeuta', null, 500);
    }
});

module.exports = router;
