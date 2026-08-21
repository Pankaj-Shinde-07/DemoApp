-- ============================================================
-- DemoApp — MySQL Database Schema
-- Simulated Organization Application for DPDPA Compliance Testing
-- ============================================================

-- Railway provides the database, no need to CREATE/USE

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
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
);

-- ============================================================
-- TABLE: admin_users
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(100)    NOT NULL UNIQUE,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    passwordHash    VARCHAR(255)    NOT NULL,
    createdAt       DATETIME        DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: consents
-- ============================================================
CREATE TABLE IF NOT EXISTS consents (
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
);

-- ============================================================
-- TABLE: consent_history
-- ============================================================
CREATE TABLE IF NOT EXISTS consent_history (
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
);

-- ============================================================
-- TABLE: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    description     TEXT            NULL,
    category        VARCHAR(100)    NULL,
    price           DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    stock           INT             DEFAULT 0,
    isActive        BOOLEAN         DEFAULT TRUE,
    createdAt       DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updatedAt       DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
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
);

-- ============================================================
-- TABLE: order_items
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    orderId         INT             NOT NULL,
    productId       INT             NOT NULL,
    quantity        INT             NOT NULL DEFAULT 1,
    unitPrice       DECIMAL(10,2)   NOT NULL,
    FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(id),
    INDEX idx_orderId (orderId)
);

-- ============================================================
-- TABLE: user_addresses
-- ============================================================
CREATE TABLE IF NOT EXISTS user_addresses (
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
);

-- ============================================================
-- TABLE: data_processing_events
-- Structured events for every personal-data operation.
-- Consumed by the external DPDPA Audit Platform.
-- ============================================================
CREATE TABLE IF NOT EXISTS data_processing_events (
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
);

-- ============================================================
-- TABLE: application_audit_logs
-- Application-level audit trail.
-- ============================================================
CREATE TABLE IF NOT EXISTS application_audit_logs (
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
);

-- ============================================================
-- TABLE: data_deletion_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    requestId       VARCHAR(36)     NOT NULL UNIQUE,
    userId          INT             NOT NULL,
    reason          TEXT            NULL,
    status          ENUM('PENDING','IN_PROGRESS','COMPLETED','REJECTED') DEFAULT 'PENDING',
    requestedAt     DATETIME        DEFAULT CURRENT_TIMESTAMP,
    completedAt     DATETIME        NULL,
    notes           TEXT            NULL,
    FOREIGN KEY (userId) REFERENCES users(id),
    INDEX idx_userId (userId),
    INDEX idx_status (status)
);
