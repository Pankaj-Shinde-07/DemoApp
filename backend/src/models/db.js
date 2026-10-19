const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host:     process.env.DATABASE_HOST     || 'localhost',
    port:     parseInt(process.env.DATABASE_PORT) || 3306,
    database: process.env.DATABASE_NAME     || 'demoapp_db',
    user:     process.env.DATABASE_USER     || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
});

const connectDB = async () => {
    try {
        const conn = await pool.getConnection();
        console.log('[DemoApp] MySQL connected successfully');
        conn.release();
    } catch (err) {
        console.warn('[DemoApp] MySQL connection warning:', err.message, '(Running in standalone/resilient mode)');
    }
};

module.exports = { pool, connectDB };
