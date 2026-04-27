// ============================================
// SANACIÓN CONSCIENTE - Business Hours Model
// ============================================

const { query } = require('../config/database');

class BusinessHours {
    // Obtener todos los horarios de la semana
    async getAll() {
        const sql = `SELECT * FROM business_hours ORDER BY day_of_week`;
        const result = await query(sql);
        return result.rows;
    }

    // Obtener horario por día de la semana
    async getByDay(dayOfWeek) {
        const sql = `SELECT * FROM business_hours WHERE day_of_week = $1 AND is_active = true`;
        const result = await query(sql, [dayOfWeek]);
        return result.rows[0] || null;
    }

    // Obtener horario de hoy
    async getToday() {
        const dayOfWeek = new Date().getDay();
        return this.getByDay(dayOfWeek);
    }

    // Verificar si el negocio está abierto
    async isOpenAt(date = null, time = null) {
        const checkDate = date || new Date().toISOString().split('T')[0];
        const checkTime = time || new Date().toTimeString().slice(0, 5);

        // Verificar si es día festivo
        const specialDay = await this.getSpecialDay(checkDate);
        if (specialDay) {
            if (!specialDay.is_open) return false;
            return this.isWithinHours(checkTime, specialDay.open_time, specialDay.close_time, specialDay.break_start, specialDay.break_end);
        }

        // Verificar horario normal
        const dayOfWeek = new Date(checkDate).getDay();
        const hours = await this.getByDay(dayOfWeek);

        if (!hours || !hours.is_open) return false;

        return this.isWithinHours(checkTime, hours.open_time, hours.close_time, hours.break_start, hours.break_end);
    }

    // Verificar si una hora está dentro del horario de atención
    isWithinHours(time, openTime, closeTime, breakStart = null, breakEnd = null) {
        const currentSeconds = this.timeToSeconds(time);
        const openSeconds = this.timeToSeconds(openTime);
        const closeSeconds = this.timeToSeconds(closeTime);

        if (currentSeconds < openSeconds || currentSeconds >= closeSeconds) return false;

        if (breakStart && breakEnd) {
            const breakStartSeconds = this.timeToSeconds(breakStart);
            const breakEndSeconds = this.timeToSeconds(breakEnd);
            if (currentSeconds >= breakStartSeconds && currentSeconds < breakEndSeconds) return false;
        }

        return true;
    }

    // Obtener días festivos
    async getSpecialDays(startDate = null, endDate = null) {
        const start = startDate || new Date().toISOString().split('T')[0];
        const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const sql = `
            SELECT * FROM special_days
            WHERE date BETWEEN $1 AND $2
            AND is_active = true
            ORDER BY date
        `;
        const result = await query(sql, [start, end]);
        return result.rows;
    }

    // Obtener día festivo específico
    async getSpecialDay(date) {
        const sql = `SELECT * FROM special_days WHERE date = $1 AND is_active = true`;
        const result = await query(sql, [date]);
        return result.rows[0] || null;
    }

    // Obtener slots disponibles para una fecha
    async getAvailableSlots(date, serviceDuration = 60) {
        const dayOfWeek = new Date(date).getDay();
        let hours = await this.getByDay(dayOfWeek);

        // Verificar si es día festivo cerrado
        const specialDay = await this.getSpecialDay(date);
        if (specialDay && !specialDay.is_open) return [];

        // Usar horario especial si existe
        if (specialDay) {
            hours = specialDay;
        }

        if (!hours || !hours.is_open) return [];

        const slots = [];
        const slotDuration = hours.slot_duration || 60;
        const openTime = this.timeToSeconds(hours.open_time);
        const closeTime = this.timeToSeconds(hours.close_time);
        const breakStart = hours.break_start ? this.timeToSeconds(hours.break_start) : null;
        const breakEnd = hours.break_end ? this.timeToSeconds(hours.break_end) : null;

        let currentTime = openTime;

        while (currentTime + (slotDuration * 60) <= closeTime) {
            // Saltar hora de descanso
            if (breakStart && breakEnd) {
                if (currentTime >= breakStart && currentTime < breakEnd) {
                    currentTime = breakEnd;
                    continue;
                }
                // Saltar si el slot se superpone con el descanso
                if (currentTime < breakStart && currentTime + (slotDuration * 60) > breakStart) {
                    currentTime = breakEnd;
                    continue;
                }
            }

            const slotTime = this.secondsToTime(currentTime);
            const available = await this.checkSlotAvailability(date, slotTime, hours.max_bookings_per_slot || 1);

            if (available) {
                slots.push({
                    time: slotTime,
                    available: true,
                    duration: slotDuration
                });
            }

            currentTime += (slotDuration * 60);
        }

        return slots;
    }

    // Verificar disponibilidad de un slot
    async checkSlotAvailability(date, time, maxBookings) {
        const sql = `
            SELECT COUNT(*) as count FROM reservations
            WHERE reservation_date = $1
            AND reservation_time = $2
            AND status IN ('pending', 'confirmed')
        `;
        const result = await query(sql, [date, time]);
        return parseInt(result.rows[0].count) < maxBookings;
    }

    // Actualizar horario
    async update(dayOfWeek, data) {
        const sql = `
            UPDATE business_hours
            SET is_open = $1,
                open_time = $2,
                close_time = $3,
                break_start = $4,
                break_end = $5,
                slot_duration = $6,
                max_bookings_per_slot = $7,
                is_active = $8
            WHERE day_of_week = $9
        `;
        const result = await query(sql, [
            data.is_open !== undefined ? data.is_open : true,
            data.open_time || null,
            data.close_time || null,
            data.break_start || null,
            data.break_end || null,
            data.slot_duration || 60,
            data.max_bookings_per_slot || 1,
            data.is_active !== undefined ? data.is_active : true,
            dayOfWeek
        ]);
        return result.rowCount > 0;
    }

    // Guardar día festivo (UPSERT)
    async saveSpecialDay(data) {
        const sql = `
            INSERT INTO special_days
            (date, name, is_open, open_time, close_time, break_start, break_end, notes, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (date)
            DO UPDATE SET
                name = EXCLUDED.name,
                is_open = EXCLUDED.is_open,
                open_time = EXCLUDED.open_time,
                close_time = EXCLUDED.close_time,
                break_start = EXCLUDED.break_start,
                break_end = EXCLUDED.break_end,
                notes = EXCLUDED.notes,
                is_active = EXCLUDED.is_active
        `;
        const result = await query(sql, [
            data.date,
            data.name,
            data.is_open !== undefined ? data.is_open : false,
            data.open_time || null,
            data.close_time || null,
            data.break_start || null,
            data.break_end || null,
            data.notes || null,
            data.is_active !== undefined ? data.is_active : true
        ]);
        return result.rowCount > 0;
    }

    // Eliminar día festivo
    async deleteSpecialDay(id) {
        const sql = `DELETE FROM special_days WHERE id = $1`;
        const result = await query(sql, [id]);
        return result.rowCount > 0;
    }

    // Obtener nombres de días
    static getDayNames() {
        return {
            0: 'Domingo',
            1: 'Lunes',
            2: 'Martes',
            3: 'Miércoles',
            4: 'Jueves',
            5: 'Viernes',
            6: 'Sábado'
        };
    }

    // Helper: convertir tiempo a segundos
    timeToSeconds(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 3600 + minutes * 60;
    }

    // Helper: convertir segundos a tiempo
    secondsToTime(seconds) {
        const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        return `${hours}:${mins}`;
    }
}

module.exports = new BusinessHours();
