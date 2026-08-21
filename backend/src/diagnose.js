require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
    const conn = await mysql.createConnection({
        host:     process.env.DATABASE_HOST,
        port:     parseInt(process.env.DATABASE_PORT),
        user:     process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME
    });

    const [cols1] = await conn.execute('SHOW COLUMNS FROM data_processing_events');
    console.log('data_processing_events cols:', cols1.map(c => c.Field).join(', '));

    const [cols2] = await conn.execute('SHOW COLUMNS FROM application_audit_logs');
    console.log('application_audit_logs cols:', cols2.map(c => c.Field).join(', '));

    const [consents] = await conn.execute('SELECT id, purpose, status FROM consents WHERE userId=1');
    console.log('consents user1:', JSON.stringify(consents));

    const [evtSample] = await conn.execute('SELECT * FROM data_processing_events LIMIT 2');
    console.log('events sample:', JSON.stringify(evtSample));

    const [logSample] = await conn.execute('SELECT * FROM application_audit_logs LIMIT 2');
    console.log('logs sample:', JSON.stringify(logSample));

    await conn.end();
}

check().catch(e => console.error('Error:', e.message));
