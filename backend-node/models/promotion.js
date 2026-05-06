// ============================================
// SANACIÓN CONSCIENTE - Promotion Model
// ============================================

const { query } = require('../config/database');

class Promotion {
    // Crear nueva promoción
    async create(data) {
        const sql = `
            INSERT INTO promotions (name, description, price, discount_type, discount_value, start_date, end_date, applicable_services, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
        `;
        const result = await query(sql, [
            data.name,
            data.description || null,
            data.price || 0,
            data.discount_type || 'fixed',
            data.discount_value || 0,
            data.start_date,
            data.end_date,
            Array.isArray(data.applicable_services) ? data.applicable_services.join(',') : (data.applicable_services || 'all'),
            data.is_active !== undefined ? data.is_active : true
        ]);
        return result.rows[0]?.id || null;
    }

    // Obtener todas las promociones
    async getAll(activeOnly = false) {
        let sql = `SELECT * FROM promotions`;
        if (activeOnly) {
            sql += ` WHERE is_active = true`;
        }
        sql += ` ORDER BY created_at DESC`;
        const result = await query(sql);
        return result.rows.map(r => this._formatRow(r));
    }

    // Obtener promoción por ID
    async getById(id) {
        const sql = `SELECT * FROM promotions WHERE id = $1`;
        const result = await query(sql, [id]);
        if (!result.rows[0]) return null;
        return this._formatRow(result.rows[0]);
    }

    // Obtener promociones activas para una fecha específica
    async getActiveForDate(date, serviceKey = null) {
        const sql = `
            SELECT * FROM promotions
            WHERE is_active = true
            AND start_date <= $1
            AND end_date >= $1
        `;
        const result = await query(sql, [date]);
        const promos = result.rows.map(r => this._formatRow(r));

        if (!serviceKey) return promos;

        // Filtrar por servicio aplicable
        return promos.filter(p => {
            if (p.applicable_services === 'all') return true;
            return p.applicable_services.includes(serviceKey);
        });
    }

    // Actualizar promoción
    async update(id, data) {
        const sql = `
            UPDATE promotions SET
                name = $1,
                description = $2,
                price = $3,
                discount_type = $4,
                discount_value = $5,
                start_date = $6,
                end_date = $7,
                applicable_services = $8,
                is_active = $9,
                updated_at = NOW()
            WHERE id = $10
        `;
        const result = await query(sql, [
            data.name,
            data.description || null,
            data.price || 0,
            data.discount_type || 'fixed',
            data.discount_value || 0,
            data.start_date,
            data.end_date,
            Array.isArray(data.applicable_services) ? data.applicable_services.join(',') : (data.applicable_services || 'all'),
            data.is_active !== undefined ? data.is_active : true,
            id
        ]);
        return result.rowCount > 0;
    }

    // Eliminar promoción
    async delete(id) {
        const sql = `DELETE FROM promotions WHERE id = $1`;
        const result = await query(sql, [id]);
        return result.rowCount > 0;
    }

    _formatRow(r) {
        return {
            ...r,
            applicable_services: r.applicable_services === 'all' ? 'all' : r.applicable_services.split(',')
        };
    }
}

module.exports = new Promotion();
