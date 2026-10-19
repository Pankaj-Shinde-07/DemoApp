const { pool } = require('../models/db');
const { logInfo } = require('../utils/logger');
const { emitEvent } = require('../events/eventEmitter');
const { validateConsentInput } = require('../utils/validation');
const { isTestMode } = require('../utils/testMode');

// ── Get Consents ──────────────────────────────────────────────────────────────
const getConsents = async (req, res) => {
    const userId = parseInt(req.params.userId);

    // Enforce ownership: User can only view their own consents unless Admin
    if (!req.user.isAdmin && userId !== req.user.userId) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You do not have permission to view consents for this user.'
        });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM consents WHERE userId = ? ORDER BY purpose',
            [userId]
        );
        return res.status(200).json({ success: true, consents: rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch consents.' });
    }
};

// ── Grant Consent ─────────────────────────────────────────────────────────────
const grantConsent = async (req, res) => {
    const { purpose } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.headers['user-agent'];

    // 1. Input Validation
    const valErr = validateConsentInput(purpose);
    if (valErr) {
        return res.status(400).json({ success: false, message: valErr });
    }

    // 2. Enforce Ownership
    const targetUserId = req.user.isAdmin && req.body.userId
        ? parseInt(req.body.userId)
        : req.user.userId;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [existing] = await conn.execute(
            'SELECT id, status FROM consents WHERE userId = ? AND purpose = ?',
            [targetUserId, purpose]
        );

        let consentId;
        const previousStatus = existing.length > 0 ? existing[0].status : null;

        if (existing.length > 0) {
            consentId = existing[0].id;
            await conn.execute(
                `UPDATE consents SET status='GRANTED', grantedAt=NOW(), withdrawnAt=NULL, updatedAt=NOW() WHERE id=?`,
                [consentId]
            );
        } else {
            const [result] = await conn.execute(
                `INSERT INTO consents (userId, purpose, status, source, grantedAt) VALUES (?, ?, 'GRANTED', 'user_action', NOW())`,
                [targetUserId, purpose]
            );
            consentId = result.insertId;
        }

        await conn.execute(
            `INSERT INTO consent_history (userId, consentId, purpose, action, previousStatus, newStatus, source, ipAddress, userAgent)
             VALUES (?, ?, ?, 'GRANTED', ?, 'GRANTED', 'user_action', ?, ?)`,
            [targetUserId, consentId, purpose, previousStatus, ip, ua]
        );

        // Commit transaction atomically
        await conn.commit();

        await logInfo({ action: 'CONSENT_GRANTED', userId: targetUserId, message: `Consent GRANTED for userId=${targetUserId} purpose=${purpose}`, ipAddress: ip });
        await emitEvent({ eventType: 'CONSENT_GRANTED', userId: targetUserId, dataFields: ['consentRecord'], purpose, ipAddress: ip, userAgent: ua });

        // Test mode scenario hook: simulate marketing processing when marketing consent granted
        if (isTestMode() && purpose === 'MARKETING') {
            await emitEvent({
                eventType: 'MARKETING_PROCESSING',
                userId: targetUserId,
                dataFields: ['email', 'mobileNumber'],
                purpose: 'MARKETING',
                ipAddress: ip,
                userAgent: ua,
                metadata: { trigger: 'CONSENT_GRANTED', note: 'Marketing processing started after consent granted.' }
            });
        }

        return res.status(200).json({ success: true, message: `Consent granted for ${purpose}.` });
    } catch (err) {
        if (conn) {
            try { await conn.rollback(); } catch (_) {}
        }
        return res.status(500).json({ success: false, message: 'Failed to grant consent. Transaction rolled back.' });
    } finally {
        if (conn) conn.release();
    }
};

// ── Withdraw Consent ──────────────────────────────────────────────────────────
const withdrawConsent = async (req, res) => {
    const consentId = parseInt(req.params.id);
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.headers['user-agent'];

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [rows] = await conn.execute('SELECT * FROM consents WHERE id = ?', [consentId]);
        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Consent record not found.' });
        }

        const consent = rows[0];

        // Enforce Ownership: Users can only withdraw their own consents
        if (!req.user.isAdmin && consent.userId !== req.user.userId) {
            await conn.rollback();
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You do not have permission to withdraw this consent.'
            });
        }

        await conn.execute(
            `UPDATE consents SET status='WITHDRAWN', withdrawnAt=NOW(), updatedAt=NOW() WHERE id=?`,
            [consentId]
        );

        await conn.execute(
            `INSERT INTO consent_history (userId, consentId, purpose, action, previousStatus, newStatus, source, ipAddress, userAgent)
             VALUES (?, ?, ?, 'WITHDRAWN', ?, 'WITHDRAWN', 'user_action', ?, ?)`,
            [consent.userId, consentId, consent.purpose, consent.status, ip, ua]
        );

        // Commit transaction atomically
        await conn.commit();

        await logInfo({ action: 'CONSENT_WITHDRAWN', userId: consent.userId, message: `Consent WITHDRAWN for userId=${consent.userId} purpose=${consent.purpose}`, ipAddress: ip });
        await emitEvent({ eventType: 'CONSENT_WITHDRAWN', userId: consent.userId, dataFields: ['consentRecord'], purpose: consent.purpose, ipAddress: ip, userAgent: ua });

        // Controlled test scenario vs production:
        // In test mode: intentionally simulate unconsented marketing processing for DPDPA RULE-005 verification.
        // In production: strictly prohibited.
        if (isTestMode() && consent.purpose === 'MARKETING') {
            await emitEvent({
                eventType: 'MARKETING_PROCESSING',
                userId: consent.userId,
                dataFields: ['email', 'mobileNumber'],
                purpose: 'MARKETING',
                ipAddress: ip,
                userAgent: ua,
                metadata: {
                    trigger: 'POST_CONSENT_WITHDRAWAL',
                    note: 'INTENTIONAL_DPDPA_TEST_CASE: CONSENT_ENFORCEMENT — Marketing processing continued after consent withdrawal. External DPDPA Audit Platform should detect this as RULE-005.'
                }
            });

            await logInfo({
                action: 'MARKETING_PROCESSING',
                userId: consent.userId,
                message: `INTENTIONAL_DPDPA_TEST_CASE: Marketing processing event emitted after consent withdrawal for userId=${consent.userId}`,
                rawLogData: { note: 'INTENTIONAL_DPDPA_TEST_CASE: CONSENT_ENFORCEMENT' },
                ipAddress: ip
            });
        }

        return res.status(200).json({ success: true, message: `Consent withdrawn for ${consent.purpose}.` });
    } catch (err) {
        if (conn) {
            try { await conn.rollback(); } catch (_) {}
        }
        return res.status(500).json({ success: false, message: 'Failed to withdraw consent. Transaction rolled back.' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = { getConsents, grantConsent, withdrawConsent };
