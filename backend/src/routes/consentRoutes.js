const router = require('express').Router();
const { getConsents, grantConsent, withdrawConsent } = require('../controllers/consentController');
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/consents/{userId}:
 *   get:
 *     summary: Get all consents for a user
 *     tags: [Consents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 */
router.get('/:userId', authMiddleware, getConsents);

/**
 * @swagger
 * /api/consents:
 *   post:
 *     summary: Grant consent for a purpose
 *     tags: [Consents]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, purpose]
 *             properties:
 *               userId:  { type: integer, example: 1 }
 *               purpose: { type: string, enum: [ACCOUNT_SERVICE, SERVICE_COMMUNICATION, MARKETING, ANALYTICS] }
 */
router.post('/', authMiddleware, grantConsent);

/**
 * @swagger
 * /api/consents/{id}/withdraw:
 *   post:
 *     summary: Withdraw consent (triggers intentional DPDPA test case for MARKETING)
 *     tags: [Consents]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 */
router.post('/:id/withdraw', authMiddleware, withdrawConsent);

module.exports = router;
