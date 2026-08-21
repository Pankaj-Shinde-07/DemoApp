const router = require('express').Router();
const {
    adminLogin,
    getUsers,
    getOrders,
    getConsents,
    getEvents,
    getAuditLogs,
    getDeletionRequests,
    resetDemoData
} = require('../controllers/adminController');
const { adminMiddleware } = require('../middleware/authMiddleware');

router.post('/login',             adminLogin);
router.get('/users',              adminMiddleware, getUsers);
router.get('/orders',             adminMiddleware, getOrders);
router.get('/consents',           adminMiddleware, getConsents);
router.get('/events',             adminMiddleware, getEvents);
router.get('/audit-logs',         adminMiddleware, getAuditLogs);
router.get('/deletion-requests',  adminMiddleware, getDeletionRequests);
router.post('/reset-demo-data',   adminMiddleware, resetDemoData);

module.exports = router;
