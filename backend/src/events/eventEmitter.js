const { pool } = require('../models/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Emit and persist a data processing event.
 * Every meaningful personal-data operation calls this.
 * These events are consumed by the external DPDPA Audit Platform.
 */
const emitEvent = async ({ eventType, userId = null, dataFields = [], purpose = null, ipAddress = null, userAgent = null, metadata = {} }) => {
    try {
        const eventId = uuidv4();
        await pool.execute(
            `INSERT INTO data_processing_events (eventId, eventType, userId, dataFields, purpose, ipAddress, userAgent, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                eventId,
                eventType,
                userId,
                JSON.stringify(dataFields),
                purpose,
                ipAddress,
                userAgent,
                JSON.stringify(metadata)
            ]
        );
        // Stream to PrivGuard auditor backend if active (fire-and-forget)
        try {
            const privguardUrl = (process.env.PRIVGUARD_URL || 'http://localhost:5000').replace(/\/$/, '');
            fetch(`${privguardUrl}/api/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    type: eventType,
                    source: 'DEMOAPP_API',
                    service: 'demoapp-service',
                    endpoint: purpose ? `/purpose/${purpose}` : '/events',
                    payload: { userId, dataFields, purpose, ...metadata },
                    timestamp: new Date().toISOString()
                })
            }).catch(() => {}); // silent fallback if PrivGuard is offline
        } catch (_) {}

        return eventId;
    } catch (err) {
        console.error(`[EventEmitter] Failed to emit event ${eventType}:`, err.message);
    }
};

module.exports = { emitEvent };
