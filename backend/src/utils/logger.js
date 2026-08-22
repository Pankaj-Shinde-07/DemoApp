const winston = require('winston');
const { pool } = require('../models/db');
const { v4: uuidv4 } = require('uuid');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/demoapp.log' })
    ]
});

/**
 * Persist a log entry to the application_audit_logs table and stream to PrivGuard in real time.
 */
const persistLog = async ({ level = 'INFO', action, userId = null, message, rawLogData = {}, ipAddress = null }) => {
    const logId = uuidv4();
    try {
        await pool.execute(
            `INSERT INTO application_audit_logs (logId, level, action, userId, message, rawLogData, ipAddress)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [logId, level.toUpperCase(), action, userId, message, JSON.stringify(rawLogData), ipAddress]
        );
    } catch (err) {
        logger.error(`Failed to persist log: ${err.message}`);
    }

    // Stream log to PrivGuard in real-time
    try {
        const privguardUrl = (process.env.PRIVGUARD_URL || 'http://localhost:5000').replace(/\/$/, '');
        fetch(`${privguardUrl}/api/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                eventId: logId,
                type: `LOG_${action || 'ENTRY'}`,
                source: 'APPLICATION_LOG',
                service: 'demoapp-core',
                endpoint: action ? `/${action.toLowerCase()}` : '/app-logs',
                payload: {
                    message,
                    action,
                    userId,
                    ipAddress,
                    ...rawLogData
                },
                timestamp: new Date().toISOString()
            })
        }).catch(() => {});
    } catch (_) {}
};

/**
 * Standard info log — no PII.
 */
const logInfo = async ({ action, userId, message, rawLogData, ipAddress }) => {
    logger.info(`[${action}] ${message}`);
    await persistLog({ level: 'INFO', action, userId, message, rawLogData, ipAddress });
};

/**
 * INTENTIONAL_DPDPA_TEST_CASE: PII_IN_LOGS
 *
 * This function intentionally logs personal data fields (name, email, mobile)
 * into the application log and the audit_logs table.
 *
 * Purpose: Allow the external DPDPA Audit Platform to detect
 * "Potential personal-data exposure in application logs" (RULE-001).
 *
 * This is a controlled, deterministic test scenario.
 * Do NOT use this function for real production logging.
 */
const logWithPII = async ({ action, userId, message, piiData = {}, ipAddress }) => {
    // Intentionally include PII in the log message
    const piiString = Object.entries(piiData)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');

    const fullMessage = `${message} ${piiString}`;

    logger.info(`[${action}] ${fullMessage}`);

    await persistLog({
        level: 'INFO',
        action,
        userId,
        message: fullMessage,
        rawLogData: {
            ...piiData,
            note: 'INTENTIONAL_DPDPA_TEST_CASE: PII_IN_LOGS'
        },
        ipAddress
    });
};

const logWarn = async ({ action, userId, message, rawLogData, ipAddress }) => {
    logger.warn(`[${action}] ${message}`);
    await persistLog({ level: 'WARN', action, userId, message, rawLogData, ipAddress });
};

const logError = async ({ action, userId, message, rawLogData, ipAddress }) => {
    logger.error(`[${action}] ${message}`);
    await persistLog({ level: 'ERROR', action, userId, message, rawLogData, ipAddress });
};

module.exports = { logger, logInfo, logWithPII, logWarn, logError };
