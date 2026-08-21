const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required.' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET_KEY);
        next();
    } catch {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

const adminMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        if (!decoded.isAdmin) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

module.exports = { authMiddleware, adminMiddleware };
