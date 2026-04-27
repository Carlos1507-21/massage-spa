// ============================================
// SANACIÓN CONSCIENTE - Therapist Model
// ============================================

const { query } = require('../config/database');

class Therapist {
    // Obtener todos los terapeutas
    async getAll(activeOnly = false) {
        let sql = `SELECT * FROM therapists`;
        const params = [];

        if (activeOnly) {
            sql += ` WHERE is_active = true`;
        }

        sql += ` ORDER BY name`;

        const result = await query(sql, params);
        return result.rows;
    }

    // Obtener terapeuta por ID
    async getById(id) {
        const sql = `SELECT * FROM therapists WHERE id = $1`;
        const result = await query(sql, [id]);
        return result.rows[0] || null;
    }

    // Crear nuevo terapeuta
    async create(data) {
        const sql = `
            INSERT INTO therapists
            (name, email, phone, specialty, bio, photo_url, is_active, max_daily_appointments)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        `;
        const result = await query(sql, [
            data.name,
            data.email || null,
            data.phone || null,
            data.specialty || null,
            data.bio || null,
            data.photo_url || null,
            data.is_active !== undefined ? data.is_active : true,
            data.max_daily_appointments || 8
        ]);
        return result.rows[0]?.id || null;
    }

    // Actualizar terapeuta
    async update(id, data) {
        const sql = `
            UPDATE therapists SET
                name = $1,
                email = $2,
                phone = $3,
                specialty = $4,
                bio = $5,
                photo_url = $6,
                is_active = $7,
                max_daily_appointments = $8
            WHERE id = $9
        `;
        const result = await query(sql, [
            data.name,
            data.email || null,
            data.phone || null,
            data.specialty || null,
            data.bio || null,
            data.photo_url || null,
            data.is_active !== undefined ? data.is_active : true,
            data.max_daily_appointments || 8,
            id
        ]);
        return result.rowCount > 0;
    }

    // Eliminar terapeuta
    async delete(id) {
        const sql = `DELETE FROM therapists WHERE id = $1`;
        const result = await query(sql, [id]);
        return result.rowCount > 0;
    }

    // Obtener disponibilidad semanal
    async getAvailability(therapistId) {
        const sql = `
            SELECT * FROM therapist_availability
            WHERE therapist_id = $1
            ORDER BY day_of_week
        `;
        const result = await query(sql, [therapistId]);
        return result.rows;
    }

    // Actualizar disponibilidad semanal (UPSERT)
    async updateAvailability(therapistId, availability) {
        const sql = `
            INSERT INTO therapist_availability
            (therapist_id, day_of_week, is_available, start_time, end_time, break_start, break_end)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (therapist_id, day_of_week)
            DO UPDATE SET
                is_available = EXCLUDED.is_available,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                break_start = EXCLUDED.break_start,
                break_end = EXCLUDED.break_end
        `;

        for (const day of availability) {
            await query(sql, [
                therapistId,
                day.day_of_week,
                day.is_available || false,
                day.start_time || null,
                day.end_time || null,
                day.break_start || null,
                day.break_end || null
            ]);
        }
        return true;
    }

    // Obtener días no disponibles
    async getUnavailableDays(therapistId, startDate = null, endDate = null) {
        const start = startDate || new Date().toISOString().split('T')[0];
        const end = endDate || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const sql = `
            SELECT * FROM therapist_unavailable_days
            WHERE therapist_id = $1
            AND date BETWEEN $2 AND $3
            ORDER BY date
        `;
        const result = await query(sql, [therapistId, start, end]);
        return result.rows;
    }

    // Agregar día no disponible (UPSERT)
    async addUnavailableDay(therapistId, data) {
        const sql = `
            INSERT INTO therapist_unavailable_days
            (therapist_id, date, reason, is_all_day, start_time, end_time)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (therapist_id, date)
            DO UPDATE SET
                reason = EXCLUDED.reason,
                is_all_day = EXCLUDED.is_all_day,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time
        `;
        const result = await query(sql, [
            therapistId,
            data.date,
            data.reason || null,
            data.is_all_day !== undefined ? data.is_all_day : true,
            data.start_time || null,
            data.end_time || null
        ]);
        return result.rowCount > 0;
    }

    // Eliminar día no disponible
    async removeUnavailableDay(id) {
        const sql = `DELETE FROM therapist_unavailable_days WHERE id = $1`;
        const result = await query(sql, [id]);
        return result.rowCount > 0;
    }

    // Verificar disponibilidad en fecha/hora específica
    async isAvailableAt(therapistId, date, time) {
        // Verificar día no disponible
        const dayUnavailable = await this.isDayUnavailable(therapistId, date, time);
        if (dayUnavailable) return false;

        // Verificar disponibilidad semanal
        const dayOfWeek = new Date(date).getDay();
        const availability = await this.getDayAvailability(therapistId, dayOfWeek);

        if (!availability || !availability.is_available) return false;

        // Verificar hora dentro del rango
        const timeSeconds = this.timeToSeconds(time);
        const startSeconds = this.timeToSeconds(availability.start_time);
        const endSeconds = this.timeToSeconds(availability.end_time);

        if (timeSeconds < startSeconds || timeSeconds >= endSeconds) return false;

        // Verificar hora de descanso
        if (availability.break_start && availability.break_end) {
            const breakStart = this.timeToSeconds(availability.break_start);
            const breakEnd = this.timeToSeconds(availability.break_end);
            if (timeSeconds >= breakStart && timeSeconds < breakEnd) return false;
        }

        // Verificar cupo máximo del día
        const dailyCount = await this.getDailyAppointmentCount(therapistId, date);
        const therapist = await this.getById(therapistId);
        const maxDaily = therapist?.max_daily_appointments || 8;

        return dailyCount < maxDaily;
    }

    // Verificar si un día específico está bloqueado
    async isDayUnavailable(therapistId, date, time = null) {
        const sql = `
            SELECT * FROM therapist_unavailable_days
            WHERE therapist_id = $1 AND date = $2
        `;
        const result = await query(sql, [therapistId, date]);
        const unavailableDay = result.rows[0];

        if (!unavailableDay) return false;
        if (unavailableDay.is_all_day) return true;

        if (time && unavailableDay.start_time && unavailableDay.end_time) {
            const timeSeconds = this.timeToSeconds(time);
            const startSeconds = this.timeToSeconds(unavailableDay.start_time);
            const endSeconds = this.timeToSeconds(unavailableDay.end_time);
            return timeSeconds >= startSeconds && timeSeconds < endSeconds;
        }

        return false;
    }

    // Obtener disponibilidad de un día específico
    async getDayAvailability(therapistId, dayOfWeek) {
        const sql = `
            SELECT * FROM therapist_availability
            WHERE therapist_id = $1 AND day_of_week = $2
        `;
        const result = await query(sql, [therapistId, dayOfWeek]);
        return result.rows[0] || null;
    }

    // Contar citas de un terapeuta en un día
    async getDailyAppointmentCount(therapistId, date) {
        const sql = `
            SELECT COUNT(*) as count FROM reservations
            WHERE therapist_id = $1
            AND reservation_date = $2
            AND status IN ('pending', 'confirmed')
        `;
        const result = await query(sql, [therapistId, date]);
        return parseInt(result.rows[0].count);
    }

    // Obtener terapeutas disponibles para fecha/hora
    async getAvailableTherapists(date, time, serviceType = null) {
        const therapists = await this.getAll(true);
        const available = [];

        for (const therapist of therapists) {
            const isAvailable = await this.isAvailableAt(therapist.id, date, time);
            if (isAvailable) {
                if (serviceType) {
                    const specialties = (therapist.specialty || '').toLowerCase();
                    if (specialties.includes(serviceType.toLowerCase())) {
                        available.push(therapist);
                    }
                } else {
                    available.push(therapist);
                }
            }
        }

        return available;
    }

    // Obtener estadísticas de un terapeuta
    async getStats(therapistId, startDate = null, endDate = null) {
        const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const end = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

        const sql = `
            SELECT
                COUNT(*) as total_appointments,
                COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
            FROM reservations
            WHERE therapist_id = $1
            AND reservation_date BETWEEN $2 AND $3
        `;
        const result = await query(sql, [therapistId, start, end]);
        return result.rows[0];
    }

    // Helper: convertir tiempo a segundos
    timeToSeconds(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 3600 + minutes * 60;
    }
}

module.exports = new Therapist();
