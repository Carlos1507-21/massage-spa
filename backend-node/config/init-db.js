// ============================================
// SANACIÓN CONSCIENTE - Database Initialization (PostgreSQL)
// ============================================
// Run: node backend-node/config/init-db.js

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'sanacion_consciente',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || ''
});

const SQL = `
-- ============================================
-- Tabla de reservas
-- ============================================
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    service VARCHAR(50) NOT NULL,
    reservation_date DATE NOT NULL,
    reservation_time TIME,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    therapist_id INTEGER,
    calendar_event_id VARCHAR(255),
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Tabla de mensajes de contacto
-- ============================================
CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    subject VARCHAR(200),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Tabla de tokens de Google Calendar
-- ============================================
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    id INTEGER PRIMARY KEY DEFAULT 1,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    scope TEXT,
    token_type VARCHAR(20) DEFAULT 'Bearer',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Tabla de horarios de atención
-- ============================================
CREATE TABLE IF NOT EXISTS business_hours (
    id SERIAL PRIMARY KEY,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    day_name VARCHAR(20) NOT NULL,
    is_open BOOLEAN DEFAULT TRUE,
    open_time TIME,
    close_time TIME,
    break_start TIME,
    break_end TIME,
    slot_duration INTEGER DEFAULT 60,
    max_bookings_per_slot INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(day_of_week)
);

-- ============================================
-- Tabla de días festivos / horarios especiales
-- ============================================
CREATE TABLE IF NOT EXISTS special_days (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_open BOOLEAN DEFAULT FALSE,
    open_time TIME,
    close_time TIME,
    break_start TIME,
    break_end TIME,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date)
);

-- ============================================
-- Tabla de terapeutas
-- ============================================
CREATE TABLE IF NOT EXISTS therapists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    specialty VARCHAR(100),
    bio TEXT,
    photo_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    max_daily_appointments INTEGER DEFAULT 8,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Tabla de disponibilidad específica de terapeutas
-- ============================================
CREATE TABLE IF NOT EXISTS therapist_availability (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    is_available BOOLEAN DEFAULT TRUE,
    start_time TIME,
    end_time TIME,
    break_start TIME,
    break_end TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(therapist_id, day_of_week)
);

-- ============================================
-- Tabla de días no disponibles del terapeuta
-- ============================================
CREATE TABLE IF NOT EXISTS therapist_unavailable_days (
    id SERIAL PRIMARY KEY,
    therapist_id INTEGER NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason VARCHAR(255),
    is_all_day BOOLEAN DEFAULT TRUE,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(therapist_id, date)
);

-- ============================================
-- Índices
-- ============================================
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_email ON reservations(email);
CREATE INDEX IF NOT EXISTS idx_special_days_date ON special_days(date);
CREATE INDEX IF NOT EXISTS idx_therapist_unavailable_days_date ON therapist_unavailable_days(date);
`;

const SEED_DATA = `
-- ============================================
-- Datos por defecto: horarios semanales
-- ============================================
INSERT INTO business_hours (day_of_week, day_name, is_open, open_time, close_time, break_start, break_end, slot_duration, max_bookings_per_slot, is_active)
VALUES
    (0, 'Domingo', FALSE, NULL, NULL, NULL, NULL, 60, 1, TRUE),
    (1, 'Lunes', TRUE, '09:00', '19:00', '14:00', '15:00', 60, 1, TRUE),
    (2, 'Martes', TRUE, '09:00', '19:00', '14:00', '15:00', 60, 1, TRUE),
    (3, 'Miércoles', TRUE, '09:00', '19:00', '14:00', '15:00', 60, 1, TRUE),
    (4, 'Jueves', TRUE, '09:00', '19:00', '14:00', '15:00', 60, 1, TRUE),
    (5, 'Viernes', TRUE, '09:00', '19:00', '14:00', '15:00', 60, 1, TRUE),
    (6, 'Sábado', TRUE, '10:00', '16:00', NULL, NULL, 60, 1, TRUE)
ON CONFLICT (day_of_week) DO NOTHING;

-- ============================================
-- Datos de ejemplo de terapeutas
-- ============================================
INSERT INTO therapists (name, email, phone, specialty, bio, is_active, max_daily_appointments)
VALUES
    ('Ana García', 'ana@sanacionconsciente.cl', '+56912345678', 'Masaje Relajante, Aromaterapia', 'Terapeuta certificada con 5 años de experiencia en masajes relajantes y aromaterapia.', TRUE, 6),
    ('Carlos Mendoza', 'carlos@sanacionconsciente.cl', '+56923456789', 'Masaje Terapéutico, Piedras Calientes', 'Especialista en terapia de tejidos profundos y masaje con piedras calientes.', TRUE, 8),
    ('María Fernández', 'maria@sanacionconsciente.cl', '+56934567890', 'Reflexología, Masaje Prenatal', 'Experta en reflexología podal y masajes especializados para embarazadas.', TRUE, 6)
ON CONFLICT DO NOTHING;
`;

async function initDatabase() {
    const client = await pool.connect();
    try {
        console.log('🌿 Sanación Consciente ASA - Inicialización de base de datos PostgreSQL\n');

        console.log('Creando tablas...');
        await client.query(SQL);
        console.log('✅ Tablas creadas correctamente\n');

        console.log('Insertando datos por defecto...');
        await client.query(SEED_DATA);
        console.log('✅ Datos insertados correctamente\n');

        console.log('🎉 Base de datos inicializada exitosamente');
    } catch (err) {
        console.error('❌ Error inicializando base de datos:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    initDatabase();
}

module.exports = { initDatabase, pool };
