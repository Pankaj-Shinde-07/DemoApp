require('dotenv').config();
const mysql = require('mysql2/promise');

async function debug() {
    const conn = await mysql.createConnection({
        host:     process.env.DATABASE_HOST,
        port:     parseInt(process.env.DATABASE_PORT),
        user:     process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME
    });

    // Test 1: consent_history insert
    try {
        await conn.execute(
            `INSERT INTO consent_history (userId, consentId, purpose, action, previousStatus, newStatus, source, ipAddress, userAgent)
             VALUES (?, ?, ?, 'GRANTED', ?, 'GRANTED', 'test', ?, ?)`,
            [1, 4, 'ANALYTICS', 'PENDING', '127.0.0.1', 'test-agent']
        );
        console.log('consent_history insert: OK');
    } catch (e) {
        console.log('consent_history insert ERROR:', e.message);
    }

    // Test 2: events with limit as integer
    try {
        const [rows] = await conn.execute('SELECT COUNT(*) as cnt FROM data_processing_events');
        console.log('events count:', rows[0].cnt);
        const [r2] = await conn.query('SELECT id FROM data_processing_events ORDER BY createdAt DESC LIMIT 5');
        console.log('events query OK, got:', r2.length);
    } catch (e) {
        console.log('events query ERROR:', e.message);
    }

    // Test 3: audit logs
    try {
        const [rows] = await conn.query('SELECT id FROM application_audit_logs ORDER BY createdAt DESC LIMIT 5');
        console.log('audit_logs query OK, got:', rows.length);
    } catch (e) {
        console.log('audit_logs query ERROR:', e.message);
    }

    await conn.end();
}

debug().catch(e => console.error(e.message));
