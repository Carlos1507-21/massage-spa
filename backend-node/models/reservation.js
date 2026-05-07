// ============================================
// SANACIÓN CONSCIENTE - Reservation Model
// ============================================

const { query } = require('../config/database');

class Reservation {
    // Crear nueva reserva
    async create(data) {
        const sql = `
            INSERT INTO reservations (name, email, phone, service, service_duration, reservation_date, reservation_time, message, therapist_id, status, price)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
            RETURNING id
        `;
        const result = await query(sql, [
            data.name,
            data.email,
            data.phone,
            data.service,
            data.service_duration || 60,
            data.date,
            data.time || null,
            data.message || null,
            data.therapist_id || null,
            data.price || null
        ]);
        return result.rows[0]?.id || null;
    }

    // Obtener todas las reservas
    async getAll(status = null) {
        let sql = `SELECT * FROM reservations`;
        const params = [];

        if (status) {
            sql += ` WHERE status = $1`;
            params.push(status);
        }

        sql += ` ORDER BY reservation_date DESC, reservation_time DESC`;

        const result = await query(sql, params);
        return result.rows;
    }

    // Obtener reserva por ID
    async getById(id) {
        const sql = `SELECT * FROM reservations WHERE id = $1`;
        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Actualizar estado de reserva
    async updateStatus(id, status) {
        const sql = `UPDATE reservations SET status = $1 WHERE id = $2`;
        const result = await query(sql, [status, id]);
        return result.rowCount > 0;
    }

    // Eliminar reserva
    async delete(id) {
        const sql = `DELETE FROM reservations WHERE id = $1`;
        const result = await query(sql, [id]);
        return result.rowCount > 0;
    }

    // Verificar disponibilidad considerando duración + preparación
    async checkAvailability(date, time, serviceDuration = 60) {
        const prepTime = 15; // Reducido de 30 a 15 min para aprovechar mejor el tiempo
        const sql = `
            SELECT COUNT(*) as count FROM reservations
            WHERE reservation_date = $1
            AND status != 'cancelled'
            AND (
                reservation_time < ($2::time + (interval '1 minute' * ($3::int + $4::int)))
                AND
                reservation_time + (interval '1 minute' * (COALESCE(service_duration, 60)::int + $4::int)) > $2::time
            )
        `;
        const result = await query(sql, [date, time, serviceDuration, prepTime]);
        return result.rows[0].count == 0;
    }

    // Obtener reservas pendientes de sincronización con Google Calendar
    async getPendingCalendarSync(limit = 10) {
        const sql = `
            SELECT * FROM reservations
            WHERE calendar_event_id IS NULL
            AND status IN ('pending', 'confirmed')
            AND reservation_date >= CURRENT_DATE
            ORDER BY reservation_date ASC, reservation_time ASC
            LIMIT $1
        `;
        const result = await query(sql, [limit]);
        return result.rows;
    }

    // Obtener reservas de mañana que necesitan recordatorio
    async getTomorrowReservations() {
        const sql = `
            SELECT * FROM reservations
            WHERE reservation_date = CURRENT_DATE + INTERVAL '1 day'
            AND status = 'confirmed'
            AND (reminder_sent IS NULL OR reminder_sent = false)
            ORDER BY reservation_time ASC
        `;
        const result = await query(sql);
        return result.rows;
    }

    // Marcar recordatorio como enviado
    async markReminderSent(id) {
        const sql = `
            UPDATE reservations
            SET reminder_sent = true, reminder_sent_at = NOW()
            WHERE id = $1
        `;
        const result = await query(sql, [id]);
        return result.rowCount > 0;
    }

    // Asignar evento de calendar
    async setCalendarEventId(id, eventId) {
        const sql = `UPDATE reservations SET calendar_event_id = $1 WHERE id = $2`;
        const result = await query(sql, [eventId, id]);
        return result.rowCount > 0;
    }

    // Actualizar precio de reserva
    async updatePrice(id, price) {
        const sql = `UPDATE reservations SET price = $1 WHERE id = $2`;
        const result = await query(sql, [price, id]);
        return result.rowCount > 0;
    }

    // Actualizar reserva completa (admin)
    async update(id, data) {
        const fields = [];
        const values = [];
        let paramIdx = 1;

        if (data.name !== undefined) { fields.push(`name = $${paramIdx++}`); values.push(data.name); }
        if (data.email !== undefined) { fields.push(`email = $${paramIdx++}`); values.push(data.email); }
        if (data.phone !== undefined) { fields.push(`phone = $${paramIdx++}`); values.push(data.phone); }
        if (data.service !== undefined) { fields.push(`service = $${paramIdx++}`); values.push(data.service); }
        if (data.service_duration !== undefined) { fields.push(`service_duration = $${paramIdx++}`); values.push(data.service_duration); }
        if (data.reservation_date !== undefined) { fields.push(`reservation_date = $${paramIdx++}`); values.push(data.reservation_date); }
        if (data.reservation_time !== undefined) { fields.push(`reservation_time = $${paramIdx++}`); values.push(data.reservation_time); }
        if (data.message !== undefined) { fields.push(`message = $${paramIdx++}`); values.push(data.message); }
        if (data.status !== undefined) { fields.push(`status = $${paramIdx++}`); values.push(data.status); }
        if (data.price !== undefined) { fields.push(`price = $${paramIdx++}`); values.push(data.price); }

        if (fields.length === 0) return false;

        values.push(id);
        const sql = `UPDATE reservations SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIdx}`;
        const result = await query(sql, values);
        return result.rowCount > 0;
    }
}

module.exports = new Reservation();
