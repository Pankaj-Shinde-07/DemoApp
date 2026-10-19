/**
 * @file ownershipMiddleware.js
 * Enforces user ownership over profiles, data exports, orders, and consents.
 * Prevents Insecure Direct Object References (IDOR).
 */

const checkUserOwnership = (paramName = 'id') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        // System administrators can inspect any resource
        if (req.user.isAdmin) {
            return next();
        }

        const rawTargetId = req.params[paramName] || req.body[paramName];
        const targetId = parseInt(rawTargetId);

        if (isNaN(targetId) || targetId !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You do not have permission to access or modify this resource.'
            });
        }

        next();
    };
};

module.exports = { checkUserOwnership };
