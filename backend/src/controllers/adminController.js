const { pool } = require('../models/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ── Admin Login ───────────────────────────────────────────────────────────────
const adminLogin = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.execute('SELECT * FROM admin_users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

        const admin = rows[0];
        const match = await bcrypt.compare(password, admin.passwordHash);
        if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

        const token = jwt.sign(
            { adminId: admin.id, username: admin.username, isAdmin: true },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '4h' }
        );

        return res.status(200).json({ success: true, accessToken: token, admin: { id: admin.id, username: admin.username, email: admin.email } });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Admin login failed.' });
    }
};

// ── Get All Users ─────────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, fullName, email, mobileNumber, dateOfBirth, gender, city, state, isActive, createdAt FROM users ORDER BY createdAt DESC'
        );
        return res.status(200).json({ success: true, users: rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
    }
};

// ── Get All Orders ────────────────────────────────────────────────────────────
const getOrders = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT o.*, u.fullName, u.email FROM orders o JOIN users u ON o.userId = u.id ORDER BY o.createdAt DESC`
        );
        return res.status(200).json({ success: true, orders: rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
    }
};

// ── Get All Consents ──────────────────────────────────────────────────────────
const getConsents = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT c.*, u.fullName, u.email FROM consents c JOIN users u ON c.userId = u.id ORDER BY c.updatedAt DESC`
        );
        return res.status(200).json({ success: true, consents: rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch consents.' });
    }
};

// ── Get Processing Events ─────────────────────────────────────────────────────
const getEvents = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 200;
        const [rows] = await pool.query(
            `SELECT * FROM data_processing_events ORDER BY createdAt DESC LIMIT ${limit}`
        );
        return res.status(200).json({ success: true, events: rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch events.' });
    }
};

// ── Get Audit Logs ────────────────────────────────────────────────────────────
const getAuditLogs = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 200;
        const [rows] = await pool.query(
            `SELECT * FROM application_audit_logs ORDER BY createdAt DESC LIMIT ${limit}`
        );
        return res.status(200).json({ success: true, logs: rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
    }
};

// ── Get Deletion Requests ─────────────────────────────────────────────────────
const getDeletionRequests = async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT dr.*, u.fullName, u.email FROM data_deletion_requests dr JOIN users u ON dr.userId = u.id ORDER BY dr.requestedAt DESC`
        );
        return res.status(200).json({ success: true, requests: rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch deletion requests.' });
    }
};

// ── Reset Demo Data ──────────────────────────────────────────────────────────
const resetDemoData = async (req, res) => {
    try {
        // Reset and re-seed clean baseline data
        await pool.execute('DELETE FROM data_deletion_requests');
        await pool.execute('DELETE FROM data_processing_events');
        await pool.execute('DELETE FROM application_audit_logs');

        // Re-insert baseline seeds
        await pool.execute(`
            INSERT INTO data_processing_events (eventId, eventType, userId, dataFields, purpose, ipAddress, metadata, createdAt)
            VALUES ('evt-retention-test-001', 'MARKETING_PROCESSING', 2, '["email","mobileNumber"]', 'MARKETING', '192.168.1.100',
            '{"note":"INTENTIONAL_DPDPA_TEST_CASE: RETENTION_PERIOD_EXCEEDED. This record is intentionally older than the declared 365-day marketing data retention period.", "declaredRetentionDays": 365}',
            DATE_SUB(NOW(), INTERVAL 400 DAY))
        `);

        await pool.execute(`
            INSERT INTO data_processing_events (eventId, eventType, userId, dataFields, purpose, ipAddress, metadata) VALUES
            ('evt-seed-001', 'USER_REGISTERED',       1, '["fullName","email","mobileNumber","dateOfBirth","address"]', 'ACCOUNT_SERVICE', '192.168.1.101', '{"source":"seed"}'),
            ('evt-seed-002', 'USER_REGISTERED',       2, '["fullName","email","mobileNumber","dateOfBirth","address"]', 'ACCOUNT_SERVICE', '192.168.1.102', '{"source":"seed"}'),
            ('evt-seed-003', 'CONSENT_GRANTED',       1, '["consentRecord"]',                                           'MARKETING',       '192.168.1.101', '{"source":"seed"}'),
            ('evt-seed-004', 'CONSENT_WITHDRAWN',     2, '["consentRecord"]',                                           'MARKETING',       '192.168.1.102', '{"source":"seed"}'),
            ('evt-seed-005', 'ORDER_CREATED',         1, '["fullName","email","mobileNumber","shippingAddress"]',        'ACCOUNT_SERVICE', '192.168.1.101', '{"source":"seed"}'),
            ('evt-seed-006', 'MARKETING_PROCESSING',  2, '["email","mobileNumber"]',                                    'MARKETING',       '192.168.1.102', '{"note":"INTENTIONAL_DPDPA_TEST_CASE: CONSENT_ENFORCEMENT. Marketing processing after consent withdrawal.", "source":"seed"}')
        `);

        await pool.execute(`
            INSERT INTO application_audit_logs (logId, level, action, userId, message, rawLogData, ipAddress) VALUES
            ('log-seed-001', 'INFO', 'USER_REGISTERED', 1, 'User registered: name=Demo User One email=user1@example.com mobile=9000000001', '{"fullName":"Demo User One","email":"user1@example.com","mobileNumber":"9000000001","note":"INTENTIONAL_DPDPA_TEST_CASE: PII_IN_LOGS"}', '192.168.1.101'),
            ('log-seed-002', 'INFO', 'USER_LOGIN',      1, 'User login successful for user1@example.com',                                   '{"email":"user1@example.com"}',                                                                                                         '192.168.1.101'),
            ('log-seed-003', 'INFO', 'ORDER_CREATED',   1, 'Order created for userId=1 mobile=9000000001',                                  '{"userId":1,"mobileNumber":"9000000001","note":"INTENTIONAL_DPDPA_TEST_CASE: PII_IN_LOGS — mobile used in order event log"}',            '192.168.1.101')
        `);

        return res.status(200).json({ success: true, message: 'DemoApp database successfully reset to clean seed state.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to reset demo data', error: err.message });
    }
};

module.exports = {
    adminLogin,
    getUsers,
    getOrders,
    getConsents,
    getEvents,
    getAuditLogs,
    getDeletionRequests,
    resetDemoData
};
