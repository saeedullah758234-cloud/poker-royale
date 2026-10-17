/**
 * ═══════════════════════════════════════════════════════
 *  PokerRoyale — Authentication & Authorization Middleware
 *  File: server/middleware/auth.js
 * ═══════════════════════════════════════════════════════
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'poker_royale_super_secret_jwt_key_2025_prod_key';

/**
 * 1. MANDATORY AUTH MIDDLEWARE
 * Verifies JWT token from Authorization header (Bearer <token>).
 * Attaches decoded user payload to `req.user`.
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No authentication token provided.'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. Malformed authentication token.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { user_id, username, email, is_admin, admin_role }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                code: 'TOKEN_EXPIRED',
                message: 'Your session has expired. Please log in again.'
            });
        }
        return res.status(401).json({
            success: false,
            code: 'INVALID_TOKEN',
            message: 'Invalid authentication token.'
        });
    }
}

/**
 * 2. OPTIONAL AUTH MIDDLEWARE
 * Attaches user to `req.user` if valid token is provided,
 * but allows the request to continue even if no token is present.
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token) {
            try {
                req.user = jwt.verify(token, JWT_SECRET);
            } catch (err) {
                // Token invalid/expired - silently ignore for optional auth
                req.user = null;
            }
        }
    }
    next();
}

/**
 * 3. ADMIN MIDDLEWARE
 * Ensures the authenticated user has admin status (`is_admin === true`).
 * Must be used AFTER `authMiddleware`.
 */
function adminMiddleware(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    if (!req.user.is_admin) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }

    next();
}

/**
 * 4. SUPER ADMIN MIDDLEWARE
 * Ensures the authenticated user has `super_admin` role.
 * Must be used AFTER `authMiddleware`.
 */
function superAdminMiddleware(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    if (req.user.admin_role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Super Admin privileges required.'
        });
    }

    next();
}

/**
 * 5. ROLE-BASED AUTHORIZATION FACTORY
 * Allows restricting routes to specific admin roles.
 * Usage: `requireRole(['super_admin', 'finance_admin'])`
 */
function requireRole(allowedRoles = []) {
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        // Super Admin bypasses role checks
        if (req.user.admin_role === 'super_admin') {
            return next();
        }

        if (!rolesArray.includes(req.user.admin_role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${rolesArray.join(' or ')}.`
            });
        }

        next();
    };
}

/**
 * 6. WEBSOCKET / SOCKET.IO AUTHENTICATION HELPER
 * Verifies token passed in WebSocket connection handshake query or headers.
 */
function socketAuth(token) {
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

module.exports = {
    authMiddleware,
    optionalAuth,
    adminMiddleware,
    superAdminMiddleware,
    requireRole,
    socketAuth
};