const router = require('express').Router();
const {
    register,
    login,
    getProfile,
    updateProfile,
    getUserEvents,
    requestDeletion,
    downloadUserData,
    submitGrievance,
    nominateRepresentative
} = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, mobileNumber, password]
 *             properties:
 *               fullName:        { type: string, example: "Demo User" }
 *               email:           { type: string, example: "user@example.com" }
 *               mobileNumber:    { type: string, example: "9000000001" }
 *               password:        { type: string, example: "Demo@1234" }
 *               dateOfBirth:     { type: string, example: "1995-06-15" }
 *               gender:          { type: string, example: "male" }
 *               address:         { type: string, example: "12 Demo Street" }
 *               city:            { type: string, example: "Mumbai" }
 *               state:           { type: string, example: "Maharashtra" }
 *               postalCode:      { type: string, example: "400001" }
 *     responses:
 *       201: { description: Registration successful }
 *       409: { description: Email or mobile already registered }
 */
router.post('/register', register);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: "user1@example.com" }
 *               password: { type: string, example: "Demo@1234" }
 *     responses:
 *       200: { description: Login successful with JWT token }
 *       401: { description: Invalid credentials }
 */
router.post('/login', login);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user profile (INTENTIONAL — returns excessive personal data)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: User profile with all personal data fields }
 */
router.get('/:id', authMiddleware, getProfile);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 */
router.put('/:id', authMiddleware, updateProfile);

/**
 * @swagger
 * /api/users/{id}/events:
 *   get:
 *     summary: Get data processing events for a user
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id/events', authMiddleware, getUserEvents);

/**
 * @swagger
 * /api/users/{id}/deletion-request:
 *   post:
 *     summary: Submit a data deletion request
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/deletion-request', authMiddleware, requestDeletion);

/**
 * @swagger
 * /api/users/{id}/download-data:
 *   get:
 *     summary: Download data principal personal data archive (DPDPA Sec 11)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id/download-data', authMiddleware, downloadUserData);

/**
 * @swagger
 * /api/users/{id}/grievance:
 *   post:
 *     summary: File a privacy grievance (DPDPA Sec 13)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/grievance', authMiddleware, submitGrievance);

/**
 * @swagger
 * /api/users/{id}/nominate:
 *   post:
 *     summary: Register a nominee representative (DPDPA Sec 14)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/:id/nominate', authMiddleware, nominateRepresentative);

module.exports = router;
