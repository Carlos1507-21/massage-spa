// ============================================
// SANACIÓN CONSCIENTE - Promotions Routes
// ============================================

const express = require('express');
const router = express.Router();
const Promotion = require('../models/promotion');
const { requireAuth, jsonResponse } = require('../middleware/auth');

// Servicios disponibles para promociones
const SERVICE_OPTIONS = [
    { key: 'relajante-espalda', name: 'Masaje Relajante (Espalda)', duration: 45, regularPrice: 20000 },
    { key: 'relajante-completo', name: 'Masaje Relajante (Cuerpo Completo)', duration: 60, regularPrice: 30000 },
    { key: 'piedras-espalda', name: 'Relajación + Piedras Calientes (Espalda)', duration: 45, regularPrice: 30000 },
    { key: 'piedras-completo', name: 'Relajación + Piedras Calientes (Cuerpo Completo)', duration: 60, regularPrice: 35000 },
    { key: 'aromaterapia-espalda', name: 'Aromaterapia (Espalda)', duration: 30, regularPrice: 25000 },
    { key: 'aromaterapia-completo', name: 'Aromaterapia (Cuerpo Completo)', duration: 45, regularPrice: 30000 }
];

/**
 * GET /backend/api/promotions
 * GET /backend/api/promotions?active=1
 * GET /backend/api/promotions?date=2024-05-10&service=relajante-espalda
 */
router.get('/', async (req, res) => {
    try {
        if (req.query.date) {
            const promos = await Promotion.getActiveForDate(req.query.date, req.query.service || null);
            return jsonResponse(res, true, 'Promociones activas', { promotions: promos, serviceOptions: SERVICE_OPTIONS });
        }

        const data = await Promotion.getAll(req.query.active === '1');
        return jsonResponse(res, true, 'Promociones obtenidas', { promotions: data, serviceOptions: SERVICE_OPTIONS });
    } catch (err) {
        console.error('Error en GET /promotions:', err);
        return jsonResponse(res, false, 'Error al obtener promociones', null, 500);
    }
});

/**
 * POST /backend/api/promotions
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const input = req.body;

        if (!input.name || !input.start_date || !input.end_date) {
            return jsonResponse(res, false, 'Nombre, fecha inicio y fecha fin son requeridos', null, 400);
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(input.end_date)) {
            return jsonResponse(res, false, 'Fechas deben usar formato YYYY-MM-DD', null, 400);
        }

        const discountType = input.discount_type || 'fixed';
        const discountValue = parseInt(input.discount_value, 10) || 0;

        if (!['fixed', 'percentage'].includes(discountType)) {
            return jsonResponse(res, false, 'Tipo de descuento debe ser "fixed" o "percentage"', null, 400);
        }

        if (discountValue <= 0) {
            return jsonResponse(res, false, 'El valor de descuento debe ser mayor a 0', null, 400);
        }

        if (discountType === 'percentage' && discountValue > 100) {
            return jsonResponse(res, false, 'El porcentaje de descuento no puede ser mayor a 100', null, 400);
        }

        // Calcular precio final para almacenar compatibilidad
        let finalPrice = discountValue;
        if (discountType === 'percentage' && Array.isArray(input.serviceOptions)) {
            const minPrice = Math.min(...input.serviceOptions.map(s => s.regularPrice));
            finalPrice = Math.round(minPrice * (1 - discountValue / 100));
        } else if (discountType === 'percentage') {
            finalPrice = 0;
        }

        input.discount_type = discountType;
        input.discount_value = discountValue;
        input.price = finalPrice;

        const id = await Promotion.create(input);

        if (id) {
            return jsonResponse(res, true, 'Promoción creada exitosamente', { id });
        } else {
            return jsonResponse(res, false, 'Error al crear promoción', null, 500);
        }
    } catch (err) {
        console.error('Error en POST /promotions:', err);
        return jsonResponse(res, false, 'Error al crear promoción', null, 500);
    }
});

/**
 * PUT /backend/api/promotions
 */
router.put('/', requireAuth, async (req, res) => {
    try {
        const input = req.body;

        if (!input.id) {
            return jsonResponse(res, false, 'ID es requerido', null, 400);
        }

        if (!input.name || !input.start_date || !input.end_date) {
            return jsonResponse(res, false, 'Nombre, fecha inicio y fecha fin son requeridos', null, 400);
        }

        const discountType = input.discount_type || 'fixed';
        const discountValue = parseInt(input.discount_value, 10) || 0;

        if (!['fixed', 'percentage'].includes(discountType)) {
            return jsonResponse(res, false, 'Tipo de descuento debe ser "fixed" o "percentage"', null, 400);
        }

        if (discountValue <= 0) {
            return jsonResponse(res, false, 'El valor de descuento debe ser mayor a 0', null, 400);
        }

        if (discountType === 'percentage' && discountValue > 100) {
            return jsonResponse(res, false, 'El porcentaje de descuento no puede ser mayor a 100', null, 400);
        }

        let finalPrice = discountValue;
        if (discountType === 'percentage') {
            finalPrice = 0;
        }

        input.discount_type = discountType;
        input.discount_value = discountValue;
        input.price = finalPrice;

        const updated = await Promotion.update(parseInt(input.id), input);

        if (updated) {
            return jsonResponse(res, true, 'Promoción actualizada exitosamente');
        } else {
            return jsonResponse(res, false, 'Promoción no encontrada', null, 404);
        }
    } catch (err) {
        console.error('Error en PUT /promotions:', err);
        return jsonResponse(res, false, 'Error al actualizar promoción', null, 500);
    }
});

/**
 * DELETE /backend/api/promotions?id=123
 */
router.delete('/', requireAuth, async (req, res) => {
    try {
        const { id } = req.query;

        if (!id || !/^\d+$/.test(String(id))) {
            return jsonResponse(res, false, 'ID inválido', null, 400);
        }

        const deleted = await Promotion.delete(parseInt(id));

        if (deleted) {
            return jsonResponse(res, true, 'Promoción eliminada exitosamente');
        } else {
            return jsonResponse(res, false, 'Promoción no encontrada', null, 404);
        }
    } catch (err) {
        console.error('Error en DELETE /promotions:', err);
        return jsonResponse(res, false, 'Error al eliminar promoción', null, 500);
    }
});

module.exports = router;
