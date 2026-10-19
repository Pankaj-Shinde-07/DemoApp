const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/db');
const { logInfo, logWithPII, logError } = require('../utils/logger');
const { emitEvent } = require('../events/eventEmitter');
const { validateRegistrationInput } = require('../utils/validation');
const { isTestMode } = require('../utils/testMode');

// ── Register ──────────────────────────────────────────────────────────────────
const register = async (req, res) => {
    // 1. Input Validation
    const validationError = validateRegistrationInput(req.body);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    const { fullName, email, mobileNumber, password, dateOfBirth, gender, address, city, state, postalCode } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.headers['user-agent'];

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [existing] = await conn.execute(
            'SELECT id FROM users WHERE email = ? OR mobileNumber = ?',
            [email.trim(), String(mobileNumber).trim()]
        );
        if (existing.length > 0) {
            await conn.rollback();
            return res.status(409).json({ success: false, message: 'Email or mobile number already registered.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await conn.execute(
            `INSERT INTO users (fullName, email, mobileNumber, passwordHash, dateOfBirth, gender, address, city, state, postalCode)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [fullName.trim(), email.trim(), String(mobileNumber).trim(), passwordHash, dateOfBirth || null, gender || 'prefer_not_to_say', address || null, city || null, state || null, postalCode || null]
        );

        const userId = result.insertId;

        // Dynamic statutory consents based on user acceptance / rejection
        const { consents: userConsents = {} } = req.body;
        const purposes = ['ACCOUNT_SERVICE', 'SERVICE_COMMUNICATION', 'MARKETING', 'ANALYTICS'];
        for (const purpose of purposes) {
            let status = 'WITHDRAWN';
            if (purpose === 'ACCOUNT_SERVICE') {
                status = 'GRANTED';
            } else if (purpose === 'SERVICE_COMMUNICATION') {
                status = userConsents.SERVICE_COMMUNICATION !== false ? 'GRANTED' : 'WITHDRAWN';
            } else if (purpose === 'MARKETING') {
                status = userConsents.MARKETING === true ? 'GRANTED' : 'WITHDRAWN';
            } else if (purpose === 'ANALYTICS') {
                status = userConsents.ANALYTICS === true ? 'GRANTED' : 'WITHDRAWN';
            }

            const grantedAt = status === 'GRANTED' ? new Date() : null;
            const withdrawnAt = status === 'WITHDRAWN' ? new Date() : null;
            const [consentRes] = await conn.execute(
                `INSERT INTO consents (userId, purpose, status, source, grantedAt, withdrawnAt) VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, purpose, status, 'user_registration', grantedAt, withdrawnAt]
            );

            await conn.execute(
                `INSERT INTO consent_history (userId, consentId, purpose, action, previousStatus, newStatus, source, ipAddress, userAgent)
                 VALUES (?, ?, ?, ?, NULL, ?, 'user_registration', ?, ?)`,
                [userId, consentRes.insertId, purpose, status, status, ip, ua]
            );
        }

        // Commit transaction atomically
        await conn.commit();

        // Logging & Telemetry: Controlled Test vs Production behavior
        if (isTestMode()) {
            // INTENTIONAL_DPDPA_TEST_CASE: PII_IN_LOGS in test mode
            await logWithPII({
                action: 'USER_REGISTERED',
                userId,
                message: 'User registered:',
                piiData: { name: fullName, email, mobile: mobileNumber },
                ipAddress: ip
            });
        } else {
            // Production: Masked log
            await logInfo({
                action: 'USER_REGISTERED',
                userId,
                message: `User registration completed for userId=${userId}`,
                ipAddress: ip
            });
        }

        await emitEvent({
            eventType: 'USER_REGISTERED',
            userId,
            dataFields: isTestMode() ? ['fullName', 'email', 'mobileNumber', 'dateOfBirth', 'address'] : ['fullName', 'email'],
            purpose: 'ACCOUNT_SERVICE',
            ipAddress: ip,
            userAgent: ua
        });

        await emitEvent({
            eventType: 'PROFILE_CREATED',
            userId,
            dataFields: isTestMode() ? ['fullName', 'email', 'mobileNumber'] : ['fullName'],
            purpose: 'ACCOUNT_SERVICE',
            ipAddress: ip,
            userAgent: ua
        });

        return res.status(201).json({ success: true, message: 'Registration successful.', userId });
    } catch (err) {
        if (conn) {
            try { await conn.rollback(); } catch (_) {}
        }
        await logError({ action: 'USER_REGISTER_ERROR', message: err.message });
        return res.status(500).json({ success: false, message: 'Registration failed. Transaction rolled back.' });
    } finally {
        if (conn) conn.release();
    }
};

// ── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.headers['user-agent'];

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? AND isActive = TRUE', [email.trim()]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, isAdmin: false },
            process.env.JWT_SECRET_KEY,
            { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
        );

        await logInfo({ action: 'USER_LOGIN', userId: user.id, message: `User login successful for userId=${user.id}`, ipAddress: ip });

        // Test mode purpose-mismatch hook
        const loginDataFields = isTestMode() ? ['email', 'mobileNumber'] : ['email'];
        await emitEvent({
            eventType: 'USER_LOGIN',
            userId: user.id,
            dataFields: loginDataFields,
            purpose: 'ACCOUNT_SERVICE',
            ipAddress: ip,
            userAgent: ua,
            metadata: isTestMode() ? { note: 'INTENTIONAL_DPDPA_TEST_CASE: PURPOSE_MISMATCH — mobileNumber used in login event' } : undefined
        });

        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            accessToken: token,
            user: { id: user.id, fullName: user.fullName, email: user.email, role: 'user' }
        });
    } catch (err) {
        await logError({ action: 'USER_LOGIN_ERROR', message: err.message });
        return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    }
};

// ── Get Profile ───────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
    const userId = parseInt(req.params.id);
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.headers['user-agent'];

    // Enforce Ownership
    if (!req.user.isAdmin && userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to view this profile.' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id, fullName, email, mobileNumber, dateOfBirth, gender, address, city, state, postalCode, createdAt FROM users WHERE id = ? AND isActive = TRUE',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        await emitEvent({
            eventType: 'USER_PROFILE_ACCESSED',
            userId,
            dataFields: isTestMode() ? ['fullName', 'email', 'mobileNumber', 'dateOfBirth', 'address'] : ['fullName', 'email'],
            purpose: 'ACCOUNT_SERVICE',
            ipAddress: ip,
            userAgent: ua,
            metadata: isTestMode() ? { note: 'INTENTIONAL_DPDPA_TEST_CASE: EXCESSIVE_API_DATA_EXPOSURE' } : undefined
        });

        await logInfo({ action: 'USER_PROFILE_ACCESSED', userId, message: `Profile accessed for userId=${userId}`, ipAddress: ip });

        return res.status(200).json({ success: true, user: rows[0] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
    }
};

// ── Update Profile ────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
    const userId = parseInt(req.params.id);

    // Enforce Ownership
    if (!req.user.isAdmin && userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to update this profile.' });
    }

    const { fullName, address, city, state, postalCode, gender } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    try {
        await pool.execute(
            `UPDATE users SET fullName=?, address=?, city=?, state=?, postalCode=?, gender=?, updatedAt=NOW() WHERE id=?`,
            [fullName ? fullName.trim() : null, address || null, city || null, state || null, postalCode || null, gender || 'prefer_not_to_say', userId]
        );

        await logInfo({ action: 'USER_PROFILE_UPDATED', userId, message: `Profile updated for userId=${userId}`, ipAddress: ip });
        await emitEvent({ eventType: 'USER_PROFILE_UPDATED', userId, dataFields: ['fullName', 'address', 'city', 'state'], purpose: 'ACCOUNT_SERVICE', ipAddress: ip });

        return res.status(200).json({ success: true, message: 'Profile updated successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to update profile.' });
    }
};

// ── Get User Events ───────────────────────────────────────────────────────────
const getUserEvents = async (req, res) => {
    const userId = parseInt(req.params.id);

    // Enforce Ownership
    if (!req.user.isAdmin && userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to access these events.' });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM data_processing_events WHERE userId = ? ORDER BY createdAt DESC LIMIT 100',
            [userId]
        );
        return res.status(200).json({ success: true, events: rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch events.' });
    }
};

// ── Deletion Request ──────────────────────────────────────────────────────────
const requestDeletion = async (req, res) => {
    const userId = parseInt(req.params.id);

    // Enforce Ownership
    if (!req.user.isAdmin && userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to submit deletion for this user.' });
    }

    const { reason } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    try {
        const [existing] = await pool.execute(
            "SELECT id FROM data_deletion_requests WHERE userId = ? AND status IN ('PENDING','IN_PROGRESS')",
            [userId]
        );
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'A deletion request is already pending.' });
        }

        const requestId = uuidv4();
        await pool.execute(
            `INSERT INTO data_deletion_requests (requestId, userId, reason, status) VALUES (?, ?, ?, 'PENDING')`,
            [requestId, userId, reason || null]
        );

        await logInfo({ action: 'DATA_DELETION_REQUESTED', userId, message: `Data deletion requested by userId=${userId}`, ipAddress: ip });
        await emitEvent({ eventType: 'DATA_DELETION_REQUESTED', userId, dataFields: [], purpose: 'ACCOUNT_SERVICE', ipAddress: ip });

        return res.status(201).json({ success: true, message: 'Deletion request submitted.', requestId });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to submit deletion request.' });
    }
};

// ── DPDPA Sec 11: Right to Access & Data Portability Download ────────────────
const downloadUserData = async (req, res) => {
    const userId = parseInt(req.params.id);

    // Enforce Ownership
    if (!req.user.isAdmin && userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to export this data archive.' });
    }

    const ip = req.ip || req.connection.remoteAddress;

    try {
        const [users] = await pool.execute(
            'SELECT id, fullName, email, mobileNumber, dateOfBirth, gender, address, city, state, postalCode, createdAt FROM users WHERE id = ?',
            [userId]
        );
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

        const [consents] = await pool.execute('SELECT purpose, status, version, grantedAt, withdrawnAt FROM consents WHERE userId = ?', [userId]);
        const [orders] = await pool.execute('SELECT id, status, totalAmount, shippingAddress, createdAt FROM orders WHERE userId = ?', [userId]);
        const [events] = await pool.execute('SELECT eventType, purpose, dataFields, createdAt FROM data_processing_events WHERE userId = ? ORDER BY createdAt DESC LIMIT 50', [userId]);
        const [deletion] = await pool.execute('SELECT requestId, status, requestedAt FROM data_deletion_requests WHERE userId = ?', [userId]);

        await emitEvent({
            eventType: 'DATA_PORTABILITY_EXPORTED',
            userId,
            dataFields: ['profile', 'consents', 'orders', 'processingEvents'],
            purpose: 'ACCOUNT_SERVICE',
            ipAddress: ip,
            metadata: { statutoryBasis: 'DPDPA 2023 Section 11 — Right to Access and Portability' }
        });

        return res.status(200).json({
            success: true,
            exportTimestamp: new Date().toISOString(),
            statutoryBasis: 'Digital Personal Data Protection Act 2023 (Section 11)',
            dataPrincipal: users[0],
            consentArtifacts: consents,
            orderHistory: orders,
            processingAuditTrail: events,
            dataSubjectRequests: deletion
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to export user data archive.' });
    }
};

// ── DPDPA Sec 13: Right to Grievance Redressal ────────────────────────────────
const submitGrievance = async (req, res) => {
    const userId = parseInt(req.params.id);

    // Enforce Ownership
    if (!req.user.isAdmin && userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to file grievances for this user.' });
    }

    const { category, complaintDetails } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    if (!complaintDetails) {
        return res.status(400).json({ success: false, message: 'Complaint details are required.' });
    }

    try {
        const grievanceId = `GRV-${Date.now()}`;
        await emitEvent({
            eventType: 'GRIEVANCE_FILED',
            userId,
            dataFields: ['complaintDetails', 'category'],
            purpose: 'GRIEVANCE_REDRESSAL',
            ipAddress: ip,
            metadata: {
                grievanceId,
                category: category || 'GENERAL_PRIVACY',
                officer: 'grievance@demoapp.local',
                statutoryResponseDays: 7,
                statutoryBasis: 'DPDPA 2023 Section 13'
            }
        });

        await logInfo({
            action: 'GRIEVANCE_FILED',
            userId,
            message: `Privacy grievance ${grievanceId} filed by user ${userId}: ${category || 'PRIVACY_COMPLAINT'}`,
            rawLogData: { grievanceId, category },
            ipAddress: ip
        });

        return res.status(201).json({
            success: true,
            message: 'Grievance registered. Designated officer will respond within statutory timeframe.',
            grievanceId,
            statutoryResponseTime: '7 business days under DPDP Rules 2025'
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to submit grievance.' });
    }
};

// ── DPDPA Sec 14: Right to Nominate ──────────────────────────────────────────
const nominateRepresentative = async (req, res) => {
    const userId = parseInt(req.params.id);

    // Enforce Ownership
    if (!req.user.isAdmin && userId !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to register nominees for this user.' });
    }

    const { nomineeName, nomineeEmail, nomineeMobile, relationship } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    if (!nomineeName || !nomineeEmail) {
        return res.status(400).json({ success: false, message: 'Nominee name and email are required.' });
    }

    try {
        const nominationId = `NOM-${Date.now()}`;
        await emitEvent({
            eventType: 'NOMINEE_REGISTERED',
            userId,
            dataFields: ['nomineeName', 'nomineeEmail', 'nomineeMobile', 'relationship'],
            purpose: 'NOMINATION_RECORD',
            ipAddress: ip,
            metadata: {
                nominationId,
                nomineeName,
                nomineeEmail,
                relationship: relationship || 'Family',
                statutoryBasis: 'DPDPA 2023 Section 14 — Right to Nominate'
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Representative nomination recorded under DPDPA Section 14.',
            nominationId
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to record nomination.' });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    getUserEvents,
    requestDeletion,
    downloadUserData,
    submitGrievance,
    nominateRepresentative
};
