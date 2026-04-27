// ============================================
// SANACIÓN CONSCIENTE - Reservation Model
// ============================================

const { query } = require('../config/database');

class Reservation {
    // Crear nueva reserva
    async create(data) {
        const sql = `
            INSERT INTO reservations (name, email, phone, service, reservation_date, reservation_time, message, therapist_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
            RETURNING id
        `;
        const result = await query(sql, [
            data.name,
            data.email,
            data.phone,
            data.service,
            data.date,
            data.time || null,
            data.message || null,
            data.therapist_id || null
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

    // Verificar disponibilidad
    async checkAvailability(date, time) {
        const sql = `
            SELECT COUNT(*) as count FROM reservations
            WHERE reservation_date = $1
            AND reservation_time = $2
            AND status != 'cancelled'
        `;
        const result = await query(sql, [date, time]);
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
}

module.exports = new Reservation();
