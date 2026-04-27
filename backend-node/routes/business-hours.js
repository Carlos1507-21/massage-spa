// ============================================
// SANACIÓN CONSCIENTE - Business Hours Routes
// ============================================

const express = require('express');
const router = express.Router();
const BusinessHours = require('../models/businessHours');
const { requireAuth, jsonResponse } = require('../middleware/auth');

/**
 * GET /backend/api/business-hours
 * GET /backend/api/business-hours?check=1&date=2024-01-01&time=10:00
 * GET /backend/api/business-hours?slots=1&date=2024-01-01
 * GET /backend/api/business-hours?special_days=1
 */
router.get('/', async (req, res) => {
    try {
        // Check de disponibilidad para el frontend público
        if (req.query.check !== undefined) {
            const date = req.query.date || new Date().toISOString().split('T')[0];
            const time = req.query.time || new Date().toTimeString().slice(0, 5);

            const isOpen = await BusinessHours.isOpenAt(date, time);
            return jsonResponse(res, true, 'Disponibilidad verificada', {
                isOpen,
                date,
                time
            });
        }

        // Obtener slots disponibles
        if (req.query.slots !== undefined) {
            const date = req.query.date || new Date().toISOString().split('T')[0];
            const duration = parseInt(req.query.duration) || 60;

            const slots = await BusinessHours.getAvailableSlots(date, duration);
            return jsonResponse(res, true, 'Slots obtenidos', {
                slots,
                date
            });
        }

        // Obtener días festivos
        if (req.query.special_days !== undefined) {
            const days = await BusinessHours.getSpecialDays(
                req.query.start || null,
                req.query.end || null
            );
            return jsonResponse(res, true, 'Días festivos obtenidos', {
                specialDays: days
            });
        }

        // Obtener todos los horarios
        const allHours = await BusinessHours.getAll();
        return jsonResponse(res, true, 'Horarios obtenidos', {
            businessHours: allHours,
            dayNames: BusinessHours.constructor.getDayNames()
        });
    } catch (err) {
        console.error('Error en GET /business-hours:', err);
        return jsonResponse(res, false, 'Error al obtener horarios', null, 500);
    }
});

/**
 * POST /backend/api/business-hours
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const input = req.body;

        if (!input) {
            return jsonResponse(res, false, 'Datos inválidos', null, 400);
        }

        // Guardar día festivo
        if (input.action === 'save_special_day') {
            if (!input.date || !input.name) {
                return jsonResponse(res, false, 'Fecha y nombre son requeridos', null, 400);
            }

            const saved = await BusinessHours.saveSpecialDay(input);

            if (saved) {
                return jsonResponse(res, true, 'Día festivo guardado exitosamente');
            } else {
                return jsonResponse(res, false, 'Error al guardar', null, 500);
            }
        }

        return jsonResponse(res, false, 'Acción no reconocida', null, 400);
    } catch (err) {
        console.error('Error en POST /business-hours:', err);
        return jsonResponse(res, false, 'Error al guardar día festivo', null, 500);
    }
});

/**
 * PUT /backend/api/business-hours
 */
router.put('/', requireAuth, async (req, res) => {
    try {
        const input = req.body;

        if (!input) {
            return jsonResponse(res, false, 'Datos inválidos', null, 400);
        }

        // Actualizar horario semanal
        if (input.action === 'update_hours') {
            if (input.dayOfWeek === undefined) {
                return jsonResponse(res, false, 'Día de la semana requerido', null, 400);
            }

            const updated = await BusinessHours.update(input.dayOfWeek, input);

            if (updated) {
                return jsonResponse(res, true, 'Horario actualizado exitosamente');
            } else {
                return jsonResponse(res, false, 'Error al actualizar', null, 500);
            }
        }

        // Actualizar día festivo
        if (input.action === 'update_special_day') {
            if (!input.id) {
                return jsonResponse(res, false, 'ID requerido', null, 400);
            }

            const saved = await BusinessHours.saveSpecialDay(input);

            if (saved) {
                return jsonResponse(res, true, 'Día festivo actualizado exitosamente');
            } else {
                return jsonResponse(res, false, 'Error al actualizar', null, 500);
            }
        }

        return jsonResponse(res, false, 'Acción no reconocida', null, 400);
    } catch (err) {
        console.error('Error en PUT /business-hours:', err);
        return jsonResponse(res, false, 'Error al actualizar horario', null, 500);
    }
});

/**
 * DELETE /backend/api/business-hours
 */
router.delete('/', requireAuth, async (req, res) => {
    try {
        const input = req.body;

        if (input.action === 'delete_special_day') {
            if (!input.id) {
                return jsonResponse(res, false, 'ID requerido', null, 400);
            }

            const deleted = await BusinessHours.deleteSpecialDay(input.id);

            if (deleted) {
                return jsonResponse(res, true, 'Día festivo eliminado exitosamente');
            } else {
                return jsonResponse(res, false, 'Error al eliminar', null, 500);
            }
        }

        return jsonResponse(res, false, 'Acción no reconocida', null, 400);
    } catch (err) {
        console.error('Error en DELETE /business-hours:', err);
        return jsonResponse(res, false, 'Error al eliminar día festivo', null, 500);
    }
});

module.exports = router;
