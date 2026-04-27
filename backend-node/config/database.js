// ============================================
// SANACIÓN CONSCIENTE - Database Configuration (PostgreSQL)
// ============================================

const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'sanacion_consciente',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    // Connection pool settings
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Log connection errors
pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Get a client from the pool
 */
async function getClient() {
    return await pool.connect();
}

/**
 * Execute a query
 */
async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed:', { text: text.substring(0, 50), duration, rows: result.rowCount });
    return result;
}

/**
 * Execute a transaction
 */
async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    pool,
    getClient,
    query,
    transaction
};
