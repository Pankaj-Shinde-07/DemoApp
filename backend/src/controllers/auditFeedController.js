const fs = require('fs');
const path = require('path');
const { pool } = require('../models/db');
const { v4: uuidv4 } = require('uuid');
const { logWithPII, logInfo, logWarn } = require('../utils/logger');
const { emitEvent } = require('../events/eventEmitter');

// Load data inventory from docs/data-inventory.json
const getInventoryData = () => {
    try {
        const filePath = path.join(__dirname, '..', '..', 'docs', 'data-inventory.json');
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (err) {
        console.error('[AuditFeed] Error reading data-inventory.json:', err.message);
    }
    return { application: 'DemoApp', dataFields: [], consentPurposes: [] };
};

// Structured Privacy Policy under DPDP Act 2023 & DPDP Rules 2025
const getPrivacyPolicyData = () => ({
    title: 'DemoApp Digital Privacy Notice',
    effectiveDate: '2025-01-01',
    fiduciary: {
        name: 'DemoApp Technologies Pvt. Ltd.',
        address: 'BKC, Mumbai, Maharashtra 400051',
        dpoContact: 'dpo@demoapp.local',
        grievanceOfficer: 'grievance@demoapp.local'
    },
    itemizedPurposes: [
        {
            purpose: 'Account Creation and Authentication',
            lawfulBasis: 'Contract / Consent',
            personalDataCollected: ['Full Name', 'Email Address', 'Password Hash'],
            retentionPeriod: '2 Years post account closure'
        },
        {
            purpose: 'Account Verification (OTP)',
            lawfulBasis: 'Consent',
            personalDataCollected: ['Mobile Number'],
            retentionPeriod: '2 Years',
            limitationClause: 'Mobile number is declared strictly for OTP authentication only and shall not be used for marketing or order tracking without separate consent.'
        },
        {
            purpose: 'Order Fulfillment & Shipping',
            lawfulBasis: 'Performance of Contract',
            personalDataCollected: ['Delivery Address', 'City', 'State', 'Postal Code'],
            retentionPeriod: '7 Years for statutory accounting compliance'
        },
        {
            purpose: 'Promotional Marketing & Offers',
            lawfulBasis: 'Explicit Consent',
            personalDataCollected: ['Email Address', 'Marketing Preferences'],
            retentionPeriod: '1 Year (365 Days) or until consent withdrawal'
        }
    ],
    principalRights: {
        rightToAccess: 'Supported via /api/users/:id/events',
        rightToCorrection: 'Supported via /api/users/:id profile update',
        rightToErasure: 'Supported via /api/users/:id/deletion-request',
        rightToWithdrawConsent: 'Supported via /api/consents/:id/withdraw',
        rightToNominate: 'Available via grievance officer contact'
    },
    version: '2025.1'
});

/**
 * GET /api/audit-feed/evidence
 * Consolidated evidence endpoint consumed by external DPDPA auditors.
 */
const getEvidencePackage = async (req, res) => {
    try {
        const inventory = getInventoryData();
        const policy = getPrivacyPolicyData();

        const [events] = await pool.execute('SELECT * FROM data_processing_events ORDER BY createdAt DESC LIMIT 200');
        const [logs] = await pool.execute('SELECT * FROM application_audit_logs ORDER BY createdAt DESC LIMIT 200');
        const [consents] = await pool.execute('SELECT c.*, u.fullName, u.email FROM consents c JOIN users u ON c.userId = u.id ORDER BY c.updatedAt DESC');
        const [consentHistory] = await pool.execute('SELECT * FROM consent_history ORDER BY createdAt DESC LIMIT 100');
        const [users] = await pool.execute('SELECT id, fullName, email, mobileNumber, dateOfBirth, gender, city, state, postalCode, isActive, createdAt FROM users ORDER BY createdAt DESC LIMIT 100');
        const [deletionRequests] = await pool.execute('SELECT dr.*, u.fullName, u.email FROM data_deletion_requests dr JOIN users u ON dr.userId = u.id ORDER BY dr.requestedAt DESC');

        // Table schema summary
        const databaseSchema = {
            tables: ['users', 'consents', 'consent_history', 'products', 'orders', 'order_items', 'user_addresses', 'data_processing_events', 'application_audit_logs', 'data_deletion_requests'],
            piiColumnsDiscovered: [
                { table: 'users', columns: ['fullName', 'email', 'mobileNumber', 'dateOfBirth', 'gender', 'address', 'city', 'state', 'postalCode'] },
                { table: 'orders', columns: ['shippingAddress', 'shippingCity', 'shippingState', 'shippingPostal'] },
                { table: 'application_audit_logs', columns: ['message', 'rawLogData'] }
            ]
        };

        return res.status(200).json({
            success: true,
            extractedAt: new Date().toISOString(),
            application: {
                name: 'DemoApp',
                environment: 'Staging / Auditor Target',
                version: '1.0.0',
                fiduciaryType: 'Significant Data Fiduciary',
                serverUrl: 'http://localhost:5001'
            },
            evidence: {
                inventory,
                policy,
                events,
                logs,
                consents,
                consentHistory,
                users,
                deletionRequests,
                databaseSchema
            }
        });
    } catch (err) {
        console.error('[AuditFeed] Evidence extraction failed:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to extract evidence package', error: err.message });
    }
};

/**
 * GET /api/audit-feed/inventory
 */
const getInventory = (req, res) => {
    const data = getInventoryData();
    return res.status(200).json({ success: true, inventory: data });
};

/**
 * GET /api/audit-feed/policy
 */
const getPrivacyPolicy = (req, res) => {
    const data = getPrivacyPolicyData();
    return res.status(200).json({ success: true, policy: data });
};

/**
 * POST /api/audit-feed/trigger-test/:scenarioId
 * Deterministically triggers a DPDPA compliance test scenario on demand.
 */
const triggerTestScenario = async (req, res) => {
    const { scenarioId } = req.params;
    const ip = req.ip || '127.0.0.1';
    const ua = req.headers['user-agent'] || 'Auditor-Test-Agent/1.0';

    try {
        switch (scenarioId) {
            case 'TEST-001': {
                // TEST-001: PII in application logs
                const testUser = {
                    name: `Audit Test User ${Math.floor(Math.random() * 1000)}`,
                    email: `audit.user.${Date.now()}@example.com`,
                    mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`
                };
                await logWithPII({
                    action: 'USER_REGISTERED_SIMULATION',
                    userId: 999,
                    message: 'Simulated registration log with raw PII:',
                    piiData: { name: testUser.name, email: testUser.email, mobile: testUser.mobile },
                    ipAddress: ip
                });
                await emitEvent({
                    eventType: 'USER_REGISTERED',
                    userId: 999,
                    dataFields: ['fullName', 'email', 'mobileNumber'],
                    purpose: 'ACCOUNT_SERVICE',
                    ipAddress: ip,
                    userAgent: ua,
                    metadata: { note: 'INTENTIONAL_DPDPA_TEST_CASE: PII_IN_LOGS (RULE-001)' }
                });
                return res.json({
                    success: true,
                    scenarioId,
                    rule: 'RULE-001',
                    severity: 'HIGH',
                    message: 'TEST-001 triggered: Plain-text PII logged to application_audit_logs and file log.',
                    data: testUser
                });
            }

            case 'TEST-002': {
                // TEST-002: Excessive API exposure
                await emitEvent({
                    eventType: 'USER_PROFILE_ACCESSED',
                    userId: 1,
                    dataFields: ['fullName', 'email', 'mobileNumber', 'dateOfBirth', 'gender', 'address', 'city', 'postalCode'],
                    purpose: 'ACCOUNT_SERVICE',
                    ipAddress: ip,
                    userAgent: ua,
                    metadata: { note: 'INTENTIONAL_DPDPA_TEST_CASE: EXCESSIVE_API_DATA_EXPOSURE (RULE-006)' }
                });
                return res.json({
                    success: true,
                    scenarioId,
                    rule: 'RULE-006',
                    severity: 'HIGH',
                    message: 'TEST-002 triggered: Excessive personal fields exposed via GET /api/users/1.',
                    exposedFields: ['fullName', 'email', 'mobileNumber', 'dateOfBirth', 'gender', 'address', 'postalCode']
                });
            }

            case 'TEST-003': {
                // TEST-003: Consent enforcement failure (Marketing continued after withdrawal)
                await emitEvent({
                    eventType: 'CONSENT_WITHDRAWN',
                    userId: 2,
                    dataFields: ['consentRecord'],
                    purpose: 'MARKETING',
                    ipAddress: ip,
                    userAgent: ua
                });
                await emitEvent({
                    eventType: 'MARKETING_PROCESSING',
                    userId: 2,
                    dataFields: ['email', 'mobileNumber'],
                    purpose: 'MARKETING',
                    ipAddress: ip,
                    userAgent: ua,
                    metadata: {
                        trigger: 'POST_CONSENT_WITHDRAWAL',
                        note: 'INTENTIONAL_DPDPA_TEST_CASE: CONSENT_ENFORCEMENT — Marketing processing continued after consent withdrawal (RULE-005).'
                    }
                });
                return res.json({
                    success: true,
                    scenarioId,
                    rule: 'RULE-005',
                    severity: 'CRITICAL',
                    message: 'TEST-003 triggered: MARKETING_PROCESSING emitted after CONSENT_WITHDRAWN event.'
                });
            }

            case 'TEST-004': {
                // TEST-004: Purpose-Use Mismatch (Mobile declared for OTP only, used in Order)
                await emitEvent({
                    eventType: 'ORDER_CREATED',
                    userId: 1,
                    dataFields: ['fullName', 'email', 'mobileNumber', 'shippingAddress'],
                    purpose: 'ACCOUNT_SERVICE',
                    ipAddress: ip,
                    userAgent: ua,
                    metadata: {
                        note: 'INTENTIONAL_DPDPA_TEST_CASE: PURPOSE_MISMATCH — mobileNumber declared for OTP only, but processed in order creation (RULE-003).'
                    }
                });
                await logInfo({
                    action: 'ORDER_CREATED',
                    userId: 1,
                    message: 'Order created with mobile=9000000001 (Purpose Mismatch)',
                    rawLogData: { mobileNumber: '9000000001', declaredPurpose: 'OTP verification only', observedEvent: 'ORDER_CREATED' },
                    ipAddress: ip
                });
                return res.json({
                    success: true,
                    scenarioId,
                    rule: 'RULE-003',
                    severity: 'HIGH',
                    message: 'TEST-004 triggered: Mobile number used outside declared OTP purpose.'
                });
            }

            case 'TEST-005': {
                // TEST-005: Retention period exceeded (>365 days)
                const eventId = `evt-retention-live-${Date.now()}`;
                await pool.execute(
                    `INSERT INTO data_processing_events (eventId, eventType, userId, dataFields, purpose, ipAddress, metadata, createdAt)
                     VALUES (?, 'MARKETING_PROCESSING', 2, '["email","mobileNumber"]', 'MARKETING', ?, ?, DATE_SUB(NOW(), INTERVAL 410 DAY))`,
                    [
                        eventId,
                        ip,
                        JSON.stringify({ note: 'INTENTIONAL_DPDPA_TEST_CASE: RETENTION_PERIOD_EXCEEDED (RULE-007)', declaredRetentionDays: 365, actualAgeDays: 410 })
                    ]
                );
                return res.json({
                    success: true,
                    scenarioId,
                    rule: 'RULE-007',
                    severity: 'MEDIUM',
                    message: 'TEST-005 triggered: Backdated 410-day-old MARKETING_PROCESSING event created (Limit: 365 days).'
                });
            }

            case 'TEST-006': {
                // TEST-006: High sensitivity Indian PII (PAN/Aadhaar) in raw logs
                const pan = `ABCDE${Math.floor(1000 + Math.random() * 9000)}F`;
                await logWithPII({
                    action: 'KYC_DOC_UPLOADED',
                    userId: 1,
                    message: 'KYC PAN document processed for identity verification:',
                    piiData: { panNumber: pan, idType: 'PAN_CARD' },
                    ipAddress: ip
                });
                await emitEvent({
                    eventType: 'PAN_KYC_PROCESSED',
                    userId: 1,
                    dataFields: ['panNumber', 'idType'],
                    purpose: 'IDENTITY_VERIFICATION',
                    ipAddress: ip,
                    metadata: { pan, note: 'INTENTIONAL_DPDPA_TEST_CASE: SENSITIVE_FINANCIAL_PII_LOGGED (RULE-001 / Sec 8(5))' }
                });
                return res.json({
                    success: true,
                    scenarioId,
                    rule: 'RULE-001',
                    severity: 'CRITICAL',
                    message: 'TEST-006 triggered: Plaintext PAN Number logged during identity verification.',
                    pan
                });
            }

            case 'TEST-007': {
                // TEST-007: Right to Erasure / Deletion request
                const requestId = uuidv4();
                await pool.execute(
                    `INSERT INTO data_deletion_requests (requestId, userId, reason, status) VALUES (?, 1, 'Data Principal exercising Right to Erasure under DPDPA Sec 12', 'PENDING')`,
                    [requestId]
                );
                await emitEvent({
                    eventType: 'DATA_DELETION_REQUESTED',
                    userId: 1,
                    dataFields: ['fullName', 'email', 'mobileNumber', 'address'],
                    purpose: 'ACCOUNT_SERVICE',
                    ipAddress: ip,
                    metadata: { requestId, statutoryBasis: 'DPDPA Section 12' }
                });
                return res.json({
                    success: true,
                    scenarioId,
                    rule: 'RULE-010',
                    severity: 'MEDIUM',
                    message: 'TEST-007 triggered: User submitted Data Erasure Request (DPDPA Sec 12).',
                    requestId
                });
            }

            case 'TEST-008': {
                // TEST-008: Architectural Privacy Drift (Phone routed to unapproved marketing service)
                const driftPhone = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;
                await emitEvent({
                    eventType: 'MARKETING_CAMPAIGN_DISPATCHED',
                    userId: 1,
                    dataFields: ['mobileNumber'],
                    purpose: 'MARKETING',
                    ipAddress: ip,
                    userAgent: ua,
                    metadata: {
                        service: 'marketing-service',
                        parentService: 'auth-service',
                        phone: driftPhone,
                        note: 'INTENTIONAL_DPDPA_TEST_CASE: PRIVACY_DRIFT — Mobile data flowed to unapproved marketing-service (Contract Violation).'
                    }
                });
                return res.json({
                    success: true,
                    scenarioId,
                    rule: 'RULE-DRIFT',
                    severity: 'CRITICAL',
                    message: 'TEST-008 triggered: Architectural Privacy Drift (Phone routed to marketing-service).',
                    phone: driftPhone
                });
            }

            case 'TEST-009': {
                // TEST-009: High-Entropy Secret & API Token Leak
                const leakedKey = 'sk_live_51MzJ7YABCD1234567890XYZWVUTSRQPONM';
                await logWithPII({
                    action: 'PAYMENT_GATEWAY_WEBHOOK',
                    userId: 1,
                    message: `Stripe webhook authentication failed with live secret key: ${leakedKey}`,
                    piiData: { apiKey: leakedKey },
                    ipAddress: ip
                });
                return res.json({
                    success: true,
                    scenarioId,
                    rule: 'RULE-SECRET-LEAK',
                    severity: 'CRITICAL',
                    message: 'TEST-009 triggered: Live API Secret Key leaked in application logs.',
                    key: leakedKey
                });
            }

            default:
                return res.status(400).json({ success: false, message: `Unknown scenarioId: ${scenarioId}. Valid IDs: TEST-001 through TEST-009` });
        }
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to trigger test scenario', error: err.message });
    }
};

module.exports = {
    getEvidencePackage,
    getInventory,
    getPrivacyPolicy,
    triggerTestScenario
};
