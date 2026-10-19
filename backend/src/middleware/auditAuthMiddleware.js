/**
 * @file auditAuthMiddleware.js
 * Scoped machine-to-machine authentication middleware for /api/audit-feed/* endpoints.
 * Protects DPDPA evidence package against unauthenticated public scraping.
 */

const jwt = require('jsonwebtoken');

const auditAuthMiddleware = (req, res, next) => {
    const expectedSecret = process.env.AUDIT_SHARED_SECRET || 'privguard-audit-feed-secret-2026';

    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;

    const auditToken = req.headers['x-audit-token'] || req.headers['x-api-key'] || bearerToken;

    // Check pre-shared M2M secret
    if (auditToken && auditToken === expectedSecret) {
        req.isAuditM2M = true;
        return next();
    }

    // Also accept authenticated DemoApp Admin JWT token
    if (bearerToken && process.env.JWT_SECRET_KEY) {
        try {
            const decoded = jwt.verify(bearerToken, process.env.JWT_SECRET_KEY);
            if (decoded && decoded.isAdmin) {
                req.user = decoded;
                return next();
            }
        } catch (_) {
            // invalid token
        }
    }

    return res.status(401).json({
        success: false,
        message: 'Unauthorized: Machine-to-machine audit credentials or admin access required to access DPDPA evidence feed.'
    });
};

module.exports = { auditAuthMiddleware };
