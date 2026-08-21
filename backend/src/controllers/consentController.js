const { pool } = require('../models/db');
const { logInfo } = require('../utils/logger');
const { emitEvent } = require('../events/eventEmitter');

// ── Get Consents ──────────────────────────────────────────────────────────────
const getConsents = async (req, res) => {
    const userId = parseInt(req.params.userId);
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
    const { userId, purpose } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.headers['user-agent'];

    if (!userId || !purpose) {
        return res.status(400).json({ success: false, message: 'userId and purpose are required.' });
    }

    try {
        const [existing] = await pool.execute(
            'SELECT id, status FROM consents WHERE userId = ? AND purpose = ?',
            [userId, purpose]
        );

        let consentId;
        const previousStatus = existing.length > 0 ? existing[0].status : null;

        if (existing.length > 0) {
            consentId = existing[0].id;
            await pool.execute(
                `UPDATE consents SET status='GRANTED', grantedAt=NOW(), withdrawnAt=NULL, updatedAt=NOW() WHERE id=?`,
                [consentId]
            );
        } else {
            const [result] = await pool.execute(
                `INSERT INTO consents (userId, purpose, status, source, grantedAt) VALUES (?, ?, 'GRANTED', 'user_action', NOW())`,
                [userId, purpose]
            );
            consentId = result.insertId;
        }

        await pool.execute(
            `INSERT INTO consent_history (userId, consentId, purpose, action, previousStatus, newStatus, source, ipAddress, userAgent)
             VALUES (?, ?, ?, 'GRANTED', ?, 'GRANTED', 'user_action', ?, ?)`,
            [userId, consentId, purpose, previousStatus, ip, ua]
        );

        await logInfo({ action: 'CONSENT_GRANTED', userId, message: `Consent GRANTED for userId=${userId} purpose=${purpose}`, ipAddress: ip });
        await emitEvent({ eventType: 'CONSENT_GRANTED', userId, dataFields: ['consentRecord'], purpose, ipAddress: ip, userAgent: ua });

        // INTENTIONAL_DPDPA_TEST_CASE: CONSENT_ENFORCEMENT
        // If marketing consent is granted, immediately trigger a marketing processing event.
        // This sets up the scenario where withdrawal can be tested.
        if (purpose === 'MARKETING') {
            await emitEvent({
                eventType: 'MARKETING_PROCESSING',
                userId,
                dataFields: ['email', 'mobileNumber'],
                purpose: 'MARKETING',
                ipAddress: ip,
                userAgent: ua,
                metadata: { trigger: 'CONSENT_GRANTED', note: 'Marketing processing started after consent granted.' }
            });
        }

        return res.status(200).json({ success: true, message: `Consent granted for ${purpose}.` });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to grant consent.' });
    }
};

// ── Withdraw Consent ──────────────────────────────────────────────────────────
const withdrawConsent = async (req, res) => {
    const consentId = parseInt(req.params.id);
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.headers['user-agent'];

    try {
        const [rows] = await pool.execute('SELECT * FROM consents WHERE id = ?', [consentId]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Consent record not found.' });
        }

        const consent = rows[0];
        await pool.execute(
            `UPDATE consents SET status='WITHDRAWN', withdrawnAt=NOW(), updatedAt=NOW() WHERE id=?`,
            [consentId]
        );

        await pool.execute(
            `INSERT INTO consent_history (userId, consentId, purpose, action, previousStatus, newStatus, source, ipAddress, userAgent)
             VALUES (?, ?, ?, 'WITHDRAWN', ?, 'WITHDRAWN', 'user_action', ?, ?)`,
            [consent.userId, consentId, consent.purpose, consent.status, ip, ua]
        );

        await logInfo({ action: 'CONSENT_WITHDRAWN', userId: consent.userId, message: `Consent WITHDRAWN for userId=${consent.userId} purpose=${consent.purpose}`, ipAddress: ip });
        await emitEvent({ eventType: 'CONSENT_WITHDRAWN', userId: consent.userId, dataFields: ['consentRecord'], purpose: consent.purpose, ipAddress: ip, userAgent: ua });

        // INTENTIONAL_DPDPA_TEST_CASE: CONSENT_ENFORCEMENT
        // After marketing consent is withdrawn, a marketing processing event is deliberately
        // still emitted. This simulates a consent-enforcement failure.
        // The external DPDPA Audit Platform should detect:
        //   CONSENT_WITHDRAWN → MARKETING_PROCESSING (continued)
        // and flag it as a potential compliance risk (RULE-005).
        if (consent.purpose === 'MARKETING') {
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
        return res.status(500).json({ success: false, message: 'Failed to withdraw consent.' });
    }
};

module.exports = { getConsents, grantConsent, withdrawConsent };
