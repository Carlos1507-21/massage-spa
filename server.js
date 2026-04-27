// ============================================
// SANACIÓN CONSCIENTE - Express Server
// ============================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const routes = require('./backend-node/routes');

const app = express();
const PORT = process.env.PORT || 3005;

// ============================================
// MIDDLEWARE GLOBAL
// ============================================

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-cambiar-en-produccion',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ============================================
// ARCHIVOS ESTÁTICOS
// ============================================

app.use('/frontend', express.static(path.join(__dirname, 'frontend')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

app.get('/', (req, res) => {
    res.redirect('/frontend/index.html');
});

// ============================================
// RUTAS API
// ============================================

app.use('/backend/api', routes);

// ============================================
// MANEJO DE ERRORES
// ============================================

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: err.message || 'Error interno del servidor'
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
    console.log(`\n🌿 Sanación Consciente ASA - Servidor corriendo`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`   Frontend: http://localhost:${PORT}/frontend/index.html`);
    console.log(`   Admin: http://localhost:${PORT}/admin/login.html`);
    console.log(`   API: http://localhost:${PORT}/backend/api\n`);
});
