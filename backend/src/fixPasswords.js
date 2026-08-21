require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function fixPasswords() {
    const conn = await mysql.createConnection({
        host:     process.env.DATABASE_HOST,
        port:     parseInt(process.env.DATABASE_PORT),
        user:     process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME
    });

    const userHash  = await bcrypt.hash('Demo@1234', 10);
    const adminHash = await bcrypt.hash('password',  10);

    const [r1] = await conn.execute(
        'UPDATE users SET passwordHash=? WHERE email IN (?,?,?)',
        [userHash, 'user1@example.com', 'user2@example.com', 'user3@example.com']
    );
    console.log(`Updated ${r1.affectedRows} user(s)`);

    const [r2] = await conn.execute(
        'UPDATE admin_users SET passwordHash=? WHERE username=?',
        [adminHash, 'admin']
    );
    console.log(`Updated ${r2.affectedRows} admin(s)`);

    await conn.end();
    console.log('All passwords fixed!');
}

fixPasswords().catch(e => { console.error('Error:', e.message); process.exit(1); });
