-- ============================================================
-- DemoApp — Seed Data
-- Simulated Organization Application for DPDPA Compliance Testing
-- ============================================================
-- Railway provides the database

-- ============================================================
-- Admin user (password: Admin@123)
-- ============================================================
INSERT INTO admin_users (username, email, passwordHash) VALUES
('admin', 'admin@demoapp.local', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- ============================================================
-- Demo users (password for all: Demo@1234)
-- Hash: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyNAcoRHa
-- ============================================================

INSERT INTO users (id, fullName, email, mobileNumber, passwordHash, dateOfBirth, gender, address, city, state, postalCode) VALUES
(1, 'Demo User One',   'user1@example.com', '9000000001', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyNAcoRHa', '1995-06-15', 'male',   '12 Demo Street, Block A', 'Mumbai',    'Maharashtra', '400001'),
(2, 'Demo User Two',   'user2@example.com', '9000000002', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyNAcoRHa', '1990-03-22', 'female', '45 Sample Road',          'Delhi',     'Delhi',       '110001'),
(3, 'Demo User Three', 'user3@example.com', '9000000003', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyNAcoRHa', '2000-11-08', 'other',  '78 Test Lane, Sector 5',  'Bengaluru', 'Karnataka',   '560001');

-- ============================================================
-- Consents
-- ============================================================
INSERT INTO consents (userId, purpose, status, grantedAt) VALUES
(1, 'ACCOUNT_SERVICE',      'GRANTED',   NOW()),
(1, 'SERVICE_COMMUNICATION','GRANTED',   NOW()),
(1, 'MARKETING',            'GRANTED',   NOW()),
(1, 'ANALYTICS',            'GRANTED',   NOW()),
(2, 'ACCOUNT_SERVICE',      'GRANTED',   NOW()),
(2, 'SERVICE_COMMUNICATION','GRANTED',   NOW()),
(2, 'MARKETING',            'WITHDRAWN', NOW()),
(2, 'ANALYTICS',            'WITHDRAWN', NOW()),
(3, 'ACCOUNT_SERVICE',      'GRANTED',   NOW()),
(3, 'SERVICE_COMMUNICATION','GRANTED',   NOW()),
(3, 'MARKETING',            'PENDING',   NULL),
(3, 'ANALYTICS',            'PENDING',   NULL);

-- ============================================================
-- Products
-- ============================================================
INSERT INTO products (name, description, category, price, stock) VALUES
('Basic Plan',    'Entry-level service plan with core features.',    'Service', 499.00,  100),
('Standard Plan', 'Standard service plan with additional features.', 'Service', 999.00,  100),
('Premium Plan',  'Full-featured premium service plan.',             'Service', 1999.00, 100),
('Demo Widget A', 'A sample physical product for demo purposes.',    'Product', 299.00,  50),
('Demo Widget B', 'Another sample product for demo purposes.',       'Product', 599.00,  50);

-- ============================================================
-- Orders
-- ============================================================
INSERT INTO orders (userId, status, totalAmount, shippingAddress, shippingCity, shippingState, shippingPostal) VALUES
(1, 'DELIVERED', 999.00,  '12 Demo Street, Block A', 'Mumbai',    'Maharashtra', '400001'),
(1, 'PROCESSING', 1999.00, '12 Demo Street, Block A', 'Mumbai',   'Maharashtra', '400001'),
(2, 'CONFIRMED',  499.00,  '45 Sample Road',          'Delhi',     'Delhi',       '110001');

INSERT INTO order_items (orderId, productId, quantity, unitPrice) VALUES
(1, 2, 1, 999.00),
(2, 3, 1, 1999.00),
(3, 1, 1, 499.00);

-- ============================================================
-- INTENTIONAL DPDPA TEST CASE — RETENTION PERIOD EXCEEDED
-- This record is intentionally backdated to simulate a scenario
-- where marketing data has exceeded its declared 365-day retention.
-- The external DPDPA Audit Platform should detect this.
-- INTENTIONAL_DPDPA_TEST_CASE: RETENTION_PERIOD_EXCEEDED
-- ============================================================
INSERT INTO data_processing_events
    (eventId, eventType, userId, dataFields, purpose, ipAddress, metadata, createdAt)
VALUES (
    'evt-retention-test-001',
    'MARKETING_PROCESSING',
    2,
    '["email","mobileNumber"]',
    'MARKETING',
    '192.168.1.100',
    '{"note":"INTENTIONAL_DPDPA_TEST_CASE: RETENTION_PERIOD_EXCEEDED. This record is intentionally older than the declared 365-day marketing data retention period.", "declaredRetentionDays": 365}',
    DATE_SUB(NOW(), INTERVAL 400 DAY)
);

-- ============================================================
-- Sample processing events
-- ============================================================
INSERT INTO data_processing_events (eventId, eventType, userId, dataFields, purpose, ipAddress, metadata) VALUES
('evt-seed-001', 'USER_REGISTERED',       1, '["fullName","email","mobileNumber","dateOfBirth","address"]', 'ACCOUNT_SERVICE',       '192.168.1.101', '{"source":"seed"}'),
('evt-seed-002', 'USER_REGISTERED',       2, '["fullName","email","mobileNumber","dateOfBirth","address"]', 'ACCOUNT_SERVICE',       '192.168.1.102', '{"source":"seed"}'),
('evt-seed-003', 'CONSENT_GRANTED',       1, '["consentRecord"]',                                           'MARKETING',             '192.168.1.101', '{"source":"seed"}'),
('evt-seed-004', 'CONSENT_WITHDRAWN',     2, '["consentRecord"]',                                           'MARKETING',             '192.168.1.102', '{"source":"seed"}'),
('evt-seed-005', 'ORDER_CREATED',         1, '["fullName","email","mobileNumber","shippingAddress"]',        'ACCOUNT_SERVICE',       '192.168.1.101', '{"source":"seed"}'),
('evt-seed-006', 'MARKETING_PROCESSING',  2, '["email","mobileNumber"]',                                    'MARKETING',             '192.168.1.102', '{"note":"INTENTIONAL_DPDPA_TEST_CASE: CONSENT_ENFORCEMENT. Marketing processing after consent withdrawal.", "source":"seed"}');

-- ============================================================
-- Sample audit logs
-- ============================================================
INSERT INTO application_audit_logs (logId, level, action, userId, message, rawLogData, ipAddress) VALUES
('log-seed-001', 'INFO', 'USER_REGISTERED', 1, 'User registered: name=Demo User One email=user1@example.com mobile=9000000001', '{"fullName":"Demo User One","email":"user1@example.com","mobileNumber":"9000000001","note":"INTENTIONAL_DPDPA_TEST_CASE: PII_IN_LOGS"}', '192.168.1.101'),
('log-seed-002', 'INFO', 'USER_LOGIN',      1, 'User login successful for user1@example.com',                                   '{"email":"user1@example.com"}',                                                                                                         '192.168.1.101'),
('log-seed-003', 'INFO', 'ORDER_CREATED',   1, 'Order created for userId=1 mobile=9000000001',                                  '{"userId":1,"mobileNumber":"9000000001","note":"INTENTIONAL_DPDPA_TEST_CASE: PII_IN_LOGS — mobile used in order event log"}',            '192.168.1.101');
