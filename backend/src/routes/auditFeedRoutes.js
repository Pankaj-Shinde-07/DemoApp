const router = require('express').Router();
const {
    getEvidencePackage,
    getInventory,
    getPrivacyPolicy,
    triggerTestScenario
} = require('../controllers/auditFeedController');
const { auditAuthMiddleware } = require('../middleware/auditAuthMiddleware');

// Enforce machine-to-machine authentication on all audit feed endpoints
router.use(auditAuthMiddleware);

/**
 * @swagger
 * /api/audit-feed/evidence:
 *   get:
 *     summary: Retrieve consolidated 3-layer DPDPA evidence package
 *     tags: [Auditor Feed]
 *     responses:
 *       200:
 *         description: Consolidated evidence containing inventory, policy, events, logs, and database schema
 */
router.get('/evidence', getEvidencePackage);

/**
 * @swagger
 * /api/audit-feed/inventory:
 *   get:
 *     summary: Retrieve declared Data Inventory (Layer 1)
 *     tags: [Auditor Feed]
 *     responses:
 *       200:
 *         description: Data inventory JSON with declared purposes and retention periods
 */
router.get('/inventory', getInventory);

/**
 * @swagger
 * /api/audit-feed/policy:
 *   get:
 *     summary: Retrieve DPDPA Privacy Notice & Transparency Rules (Layer 1)
 *     tags: [Auditor Feed]
 *     responses:
 *       200:
 *         description: Standalone privacy notice structured under DPDP Rules 2025
 */
router.get('/policy', getPrivacyPolicy);

/**
 * @swagger
 * /api/audit-feed/trigger-test/{scenarioId}:
 *   post:
 *     summary: Trigger intentional DPDPA compliance test scenario on demand
 *     tags: [Auditor Feed]
 *     parameters:
 *       - in: path
 *         name: scenarioId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [TEST-001, TEST-002, TEST-003, TEST-004, TEST-005, TEST-006, TEST-007]
 *         description: Test scenario identifier
 *     responses:
 *       200:
 *         description: Test scenario executed and telemetry emitted
 */
router.post('/trigger-test/:scenarioId', triggerTestScenario);

module.exports = router;
