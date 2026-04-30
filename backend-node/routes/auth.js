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

    // Guardar datos para regenerar sesión tras login exitoso
    const originalSession = req.session;

    const success = await login(req, username, password);

    if (success) {
        // Regenerar session ID para prevenir session fixation
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regenerate error:', err);
                return jsonResponse(res, false, 'Error al iniciar sesión', null, 500);
            }
            req.session.adminLoggedIn = true;
            req.session.adminUsername = username;
            req.session.loginTime = Date.now();
            return jsonResponse(res, true, 'Login exitoso');
        });
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
            username: req.session.adminUsername || 'Mabel',
            login_time: req.session.loginTime || null
        });
    } else {
        return jsonResponse(res, false, 'No autenticado', null, 401);
    }
});

module.exports = router;
