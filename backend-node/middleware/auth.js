// ============================================
// SANACIÓN CONSCIENTE - Authentication Middleware
// ============================================

const bcrypt = require('bcryptjs');

// Admin user (hardcoded, same as PHP version)
const ADMIN_USER = {
    username: 'admin',
    // bcrypt hash of "password"
    passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
};

/**
 * Check if user is authenticated
 */
function checkAuth(req) {
    return req.session && req.session.adminLoggedIn === true;
}

/**
 * Login middleware
 */
async function login(req, username, password) {
    if (username !== ADMIN_USER.username) {
        return false;
    }

    const valid = await bcrypt.compare(password, ADMIN_USER.passwordHash);
    if (!valid) {
        return false;
    }

    req.session.adminLoggedIn = true;
    req.session.adminUsername = username;
    req.session.loginTime = Date.now();

    return true;
}

/**
 * Logout middleware
 */
function logout(req) {
    return new Promise((resolve) => {
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
            resolve(!err);
        });
    });
}

/**
 * Require authentication middleware for Express routes
 */
function requireAuth(req, res, next) {
    if (!checkAuth(req)) {
        return res.status(401).json({
            success: false,
            message: 'No autorizado'
        });
    }
    next();
}

/**
 * Helper for JSON responses
 */
function jsonResponse(res, success, message = '', data = null, statusCode = 200) {
    const response = { success, message };
    if (data !== null) {
        response.data = data;
    }
    return res.status(statusCode).json(response);
}

module.exports = {
    checkAuth,
    login,
    logout,
    requireAuth,
    jsonResponse
};
