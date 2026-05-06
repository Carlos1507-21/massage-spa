// ============================================
// SANACIÓN CONSCIENTE - Express Server
// ============================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const routes = require('./backend-node/routes');

const app = express();
const PORT = process.env.PORT || 3005;
const isProd = process.env.NODE_ENV === 'production';

// ============================================
// SEGURIDAD
// ============================================

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            scriptSrc: ["'self'", "https://static.cloudflareinsights.com"],
            connectSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Demasiadas solicitudes, intenta más tarde' }
});
app.use('/backend/api/', limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Demasiados intentos de login, intenta más tarde' }
});
app.use('/backend/api/auth/login', authLimiter);

const reservationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Demasiadas reservas desde esta IP, intenta más tarde' }
});
app.use('/backend/api/reservations', reservationLimiter);

// ============================================
// MIDDLEWARE GLOBAL
// ============================================

if (isProd) {
    app.set('trust proxy', 1);
}

app.use(cors({
    origin: isProd ? process.env.FRONTEND_URL || false : true,
    credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (isProd && !process.env.SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET no está definida en producción');
    process.exit(1);
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-cambiar-en-produccion',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
        secure: isProd,
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// ============================================
// ARCHIVOS ESTÁTICOS Y RUTAS LIMPIAS
// ============================================

// Redirect rutas antiguas /frontend/* a raíz
app.get('/frontend*', (req, res) => {
    const cleanPath = req.path.replace(/^\/frontend/, '') || '/';
    res.redirect(301, cleanPath);
});

// Frontend servido desde raíz (URL limpia: / en vez de /frontend/index.html)
app.use('/', express.static(path.join(__dirname, 'frontend'), { index: 'index.html' }));

// Redirect rutas .html antiguas del admin a limpias
app.get('/admin/login.html', (req, res) => res.redirect(301, '/admin/login'));
app.get('/admin/dashboard.html', (req, res) => res.redirect(301, '/admin/dashboard'));

// Admin estáticos (CSS, JS, imágenes)
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Admin rutas limpias (sin .html)
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});
app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// Redirect /admin y /admin/ al login
app.get('/admin', (req, res) => res.redirect(301, '/admin/login'));
app.get('/admin/', (req, res) => res.redirect(301, '/admin/login'));

// ============================================
// RUTAS API
// ============================================

app.use('/backend/api', routes);

// ============================================
// MANEJO DE ERRORES
// ============================================

app.use((err, req, res, next) => {
    console.error('Error:', err);
    const message = isProd ? 'Error interno del servidor' : (err.message || 'Error interno del servidor');
    res.status(500).json({
        success: false,
        message
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
    console.log(`\n🌿 Sanación Consciente ASA - Servidor corriendo`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`   Frontend: http://localhost:${PORT}/`);
    console.log(`   Admin: http://localhost:${PORT}/admin/login`);
    console.log(`   API: http://localhost:${PORT}/backend/api\n`);
});
