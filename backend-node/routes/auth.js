// ============================================
// SANACIÓN CONSCIENTE - Authentication Routes
// ============================================

const express = require('express');
const router = express.Router();
const { login, logout, checkAuth, jsonResponse } = require('../middleware/auth');

/**
 * POST /backend/api/auth/login
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return jsonResponse(res, false, 'Usuario y contraseña son requeridos', null, 400);
    }

    const success = await login(req, username, password);

    if (success) {
        return jsonResponse(res, true, 'Login exitoso');
    } else {
        return jsonResponse(res, false, 'Credenciales incorrectas', null, 401);
    }
});

/**
 * POST /backend/api/auth/logout
 */
router.post('/logout', async (req, res) => {
    await logout(req);
    return jsonResponse(res, true, 'Logout exitoso');
});

/**
 * GET /backend/api/auth/check
 */
router.get('/check', (req, res) => {
    if (checkAuth(req)) {
        return jsonResponse(res, true, 'Autenticado', {
            username: req.session.adminUsername || 'admin',
            login_time: req.session.loginTime || null
        });
    } else {
        return jsonResponse(res, false, 'No autenticado', null, 401);
    }
});

module.exports = router;
