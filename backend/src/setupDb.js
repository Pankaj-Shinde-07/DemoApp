require('dotenv').config();
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

async function setup() {
    const host = process.env.DATABASE_HOST || 'localhost';
    const port = parseInt(process.env.DATABASE_PORT || '3306');
    const user = process.env.DATABASE_USER || 'root';
    const password = process.env.DATABASE_PASSWORD || '';
    const database = process.env.DATABASE_NAME || 'sbms';

    console.log(`1. Connecting to MySQL at ${host}:${port} as ${user}...`);

    const rootConn = await mysql.createConnection({ host, port, user, password });
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.end();

    const conn = await mysql.createConnection({
        host,
        port,
        user,
        password,
        database,
        multipleStatements: true
    });

    console.log(`2. Cleaning existing DemoApp tables in '${database}'...`);
    await conn.query(`SET FOREIGN_KEY_CHECKS = 0;`);

    const tablesToDrop = [
        'authorities', 'order_items', 'orders', 'consent_history', 'consents', 
        'user_addresses', 'data_deletion_requests', 'data_processing_events', 
        'application_audit_logs', 'admin_users', 'products', 'users'
    ];

    for (const t of tablesToDrop) {
        await conn.query(`DROP TABLE IF EXISTS \`${t}\`;`);
    }
    console.log('✓ Old tables dropped.');

    console.log('3. Creating DemoApp tables in order...');

    const statements = [
        // 1. users
        `CREATE TABLE users (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            fullName        VARCHAR(150)    NOT NULL,
            email           VARCHAR(255)    NOT NULL UNIQUE,
            mobileNumber    VARCHAR(15)     NOT NULL,
            passwordHash    VARCHAR(255)    NOT NULL,
            dateOfBirth     DATE            NULL,
            gender          ENUM('male','female','other','prefer_not_to_say') DEFAULT 'prefer_not_to_say',
            address         TEXT            NULL,
            city            VARCHAR(100)    NULL,
            state           VARCHAR(100)    NULL,
            postalCode      VARCHAR(10)     NULL,
            profileImage    VARCHAR(500)    NULL,
            isActive        BOOLEAN         DEFAULT TRUE,
            isAdmin         BOOLEAN         DEFAULT FALSE,
            createdAt       DATETIME        DEFAULT CURRENT_TIMESTAMP,
            updatedAt       DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_email (email),
            INDEX idx_mobile (mobileNumber)
        ) ENGINE=InnoDB;`,

        // 2. admin_users
        `CREATE TABLE admin_users (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            username        VARCHAR(100)    NOT NULL UNIQUE,
            email           VARCHAR(255)    NOT NULL UNIQUE,
            passwordHash    VARCHAR(255)    NOT NULL,
            createdAt       DATETIME        DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;`,

        // 3. consents
        `CREATE TABLE consents (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            userId          INT             NOT NULL,
            purpose         ENUM('ACCOUNT_SERVICE','SERVICE_COMMUNICATION','MARKETING','ANALYTICS') NOT NULL,
            status          ENUM('GRANTED','WITHDRAWN','PENDING') DEFAULT 'PENDING',
            version         VARCHAR(20)     DEFAULT '1.0',
            source          VARCHAR(100)    DEFAULT 'user_registration',
            grantedAt       DATETIME        NULL,
            withdrawnAt     DATETIME        NULL,
            createdAt       DATETIME        DEFAULT CURRENT_TIMESTAMP,
            updatedAt       DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_user_purpose (userId, purpose),
            INDEX idx_userId (userId),
            INDEX idx_purpose (purpose)
        ) ENGINE=InnoDB;`,

        // 4. consent_history
        `CREATE TABLE consent_history (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            userId          INT             NOT NULL,
            consentId       INT             NOT NULL,
            purpose         VARCHAR(100)    NOT NULL,
            action          ENUM('GRANTED','WITHDRAWN','UPDATED') NOT NULL,
            previousStatus  VARCHAR(50)     NULL,
            newStatus       VARCHAR(50)     NOT NULL,
            source          VARCHAR(100)    NULL,
            ipAddress       VARCHAR(45)     NULL,
            userAgent       TEXT            NULL,
            createdAt       DATETIME        DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_userId (userId),
            INDEX idx_consentId (consentId)
        ) ENGINE=InnoDB;`,

        // 5. products
        `CREATE TABLE products (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            name            VARCHAR(200)    NOT NULL,
            description     TEXT            NULL,
            category        VARCHAR(100)    NULL,
            price           DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
            stock           INT             DEFAULT 0,
            isActive        BOOLEAN         DEFAULT TRUE,
            createdAt       DATETIME        DEFAULT CURRENT_TIMESTAMP,
            updatedAt       DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;`,

        // 6. orders
        `CREATE TABLE orders (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            userId          INT             NOT NULL,
            status          ENUM('PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED') DEFAULT 'PENDING',
            totalAmount     DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
            shippingAddress TEXT            NULL,
            shippingCity    VARCHAR(100)    NULL,
            shippingState   VARCHAR(100)    NULL,
            shippingPostal  VARCHAR(10)     NULL,
            notes           TEXT            NULL,
            createdAt       DATETIME        DEFAULT CURRENT_TIMESTAMP,
            updatedAt       DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_userId (userId),
            INDEX idx_status (status)
        ) ENGINE=InnoDB;`,

        // 7. order_items
        `CREATE TABLE order_items (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            orderId         INT             NOT NULL,
            productId       INT             NOT NULL,
            quantity        INT             NOT NULL DEFAULT 1,
            unitPrice       DECIMAL(10,2)   NOT NULL,
            FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
            FOREIGN KEY (productId) REFERENCES products(id),
            INDEX idx_orderId (orderId)
        ) ENGINE=InnoDB;`,

        // 8. user_addresses
        `CREATE TABLE user_addresses (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            userId          INT             NOT NULL,
            label           VARCHAR(50)     DEFAULT 'Home',
            address         TEXT            NOT NULL,
            city            VARCHAR(100)    NOT NULL,
            state           VARCHAR(100)    NOT NULL,
            postalCode      VARCHAR(10)     NOT NULL,
            isDefault       BOOLEAN         DEFAULT FALSE,
            createdAt       DATETIME        DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_userId (userId)
        ) ENGINE=InnoDB;`,

        // 9. data_processing_events
        `CREATE TABLE data_processing_events (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            eventId         VARCHAR(36)     NOT NULL UNIQUE,
            eventType       VARCHAR(100)    NOT NULL,
            userId          INT             NULL,
            dataFields      JSON            NULL,
            purpose         VARCHAR(100)    NULL,
            ipAddress       VARCHAR(45)     NULL,
            userAgent       TEXT            NULL,
            metadata        JSON            NULL,
            createdAt       DATETIME        DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_eventType (eventType),
            INDEX idx_userId (userId),
            INDEX idx_createdAt (createdAt)
        ) ENGINE=InnoDB;`,

        // 10. application_audit_logs
        `CREATE TABLE application_audit_logs (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            logId           VARCHAR(36)     NOT NULL UNIQUE,
            level           ENUM('INFO','WARN','ERROR','DEBUG') DEFAULT 'INFO',
            action          VARCHAR(100)    NOT NULL,
            userId          INT             NULL,
            message         TEXT            NOT NULL,
            rawLogData      JSON            NULL,
            ipAddress       VARCHAR(45)     NULL,
            createdAt       DATETIME        DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_action (action),
            INDEX idx_userId (userId),
            INDEX idx_level (level),
            INDEX idx_createdAt (createdAt)
        ) ENGINE=InnoDB;`,

        // 11. data_deletion_requests
        `CREATE TABLE data_deletion_requests (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            requestId       VARCHAR(36)     NOT NULL UNIQUE,
            userId          INT             NOT NULL,
            reason          TEXT            NULL,
            status          ENUM('PENDING','IN_PROGRESS','COMPLETED','REJECTED') DEFAULT 'PENDING',
            requestedAt     DATETIME        DEFAULT CURRENT_TIMESTAMP,
            completedAt     DATETIME        NULL,
            notes           TEXT            NULL,
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_userId (userId),
            INDEX idx_status (status)
        ) ENGINE=InnoDB;`
    ];

    for (const sql of statements) {
        await conn.query(sql);
    }
    await conn.query(`SET FOREIGN_KEY_CHECKS = 1;`);
    console.log('✓ All 11 DemoApp tables created with InnoDB engine.');

    // 4. Seed data
    const seedPath = path.join(__dirname, '../database/seed.sql');
    if (fs.existsSync(seedPath)) {
        console.log('4. Seeding DemoApp database...');
        const seed = fs.readFileSync(seedPath, 'utf8');
        await conn.query(seed);
        console.log('✓ Seed users, products, orders, and consents inserted.');
    }

    const [tables] = await conn.query('SHOW TABLES;');
    console.log(`\n🎉 Verification complete! ${tables.length} tables in '${database}'.`);
    await conn.end();
}

setup().catch(e => {
    console.error('❌ Setup error:', e.message);
    process.exit(1);
});
