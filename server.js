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
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
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
