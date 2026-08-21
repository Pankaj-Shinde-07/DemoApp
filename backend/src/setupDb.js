require('dotenv').config();
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

async function setup() {
    const conn = await mysql.createConnection({
        host:     process.env.DATABASE_HOST,
        port:     parseInt(process.env.DATABASE_PORT),
        user:     process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        multipleStatements: true
    });

    console.log('Connected to Railway MySQL');

    const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    const seed   = fs.readFileSync(path.join(__dirname, '../database/seed.sql'),   'utf8');

    console.log('Running schema...');
    await conn.query(schema);
    console.log('Schema done.');

    console.log('Running seed...');
    try {
        await conn.query(seed);
        console.log('Seed done.');
    } catch (e) {
        // Seed may fail on duplicate run — that is fine
        console.log('Seed note:', e.message);
    }

    await conn.end();
    console.log('Database setup complete!');
}

setup().catch(e => { console.error('Setup failed:', e.message); process.exit(1); });
