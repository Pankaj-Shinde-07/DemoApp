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
 * Persist a log entry to the application_audit_logs table.
 */
const persistLog = async ({ level = 'INFO', action, userId = null, message, rawLogData = {}, ipAddress = null }) => {
    try {
        await pool.execute(
            `INSERT INTO application_audit_logs (logId, level, action, userId, message, rawLogData, ipAddress)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), level.toUpperCase(), action, userId, message, JSON.stringify(rawLogData), ipAddress]
        );
    } catch (err) {
        logger.error(`Failed to persist log: ${err.message}`);
    }
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
