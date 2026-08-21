require('dotenv').config();
const http = require('http');

const BASE = 'http://localhost:5001';
let TOKEN = '';
let ADMIN_TOKEN = '';
let CONSENT_ID = '';

function req(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: 'localhost',
            port: 5001,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const r = http.request(opts, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, body: raw }); }
            });
        });
        r.on('error', reject);
        if (data) r.write(data);
        r.end();
    });
}

function pass(label, res) {
    const ok = res.body?.success !== false;
    console.log(`${ok ? '✅' : '❌'} ${label} [${res.status}]`);
    if (!ok) console.log('   →', res.body?.message || res.body);
    return ok;
}

async function runTests() {
    console.log('\n========================================');
    console.log('  DemoApp — Full API Test Suite');
    console.log('========================================\n');

    // 1. Health
    let r = await req('GET', '/health');
    pass('Health check', r);

    // 2. Products (public)
    r = await req('GET', '/api/products');
    pass('GET /api/products', r);

    // 3. Register new user
    r = await req('POST', '/api/users/register', {
        fullName: 'API Test User', email: 'apitest@example.com',
        mobileNumber: '9222222222', password: 'Demo@1234',
        city: 'Delhi', state: 'Delhi'
    });
    pass('POST /api/users/register', r);

    // 4. Login seeded user
    r = await req('POST', '/api/users/login', { email: 'user1@example.com', password: 'Demo@1234' });
    const loginOk = pass('POST /api/users/login', r);
    if (loginOk) TOKEN = r.body.accessToken;

    // 5. Get profile (TEST-002: excessive data)
    r = await req('GET', '/api/users/1', null, TOKEN);
    pass('GET /api/users/1 (excessive data test)', r);
    if (r.body?.user) {
        const fields = Object.keys(r.body.user);
        console.log('   → Fields returned:', fields.join(', '));
    }

    // 6. Update profile
    r = await req('PUT', '/api/users/1', { fullName: 'Demo User One', city: 'Mumbai', state: 'Maharashtra', address: '12 Demo St', postalCode: '400001', gender: 'male' }, TOKEN);
    pass('PUT /api/users/1', r);

    // 7. Get consents
    r = await req('GET', '/api/consents/1', null, TOKEN);
    pass('GET /api/consents/1', r);
    if (r.body?.consents) {
        const marketing = r.body.consents.find(c => c.purpose === 'MARKETING');
        if (marketing) CONSENT_ID = marketing.id;
        console.log('   → Consent count:', r.body.consents.length);
    }

    // 8. Grant consent
    r = await req('POST', '/api/consents', { userId: 1, purpose: 'ANALYTICS' }, TOKEN);
    pass('POST /api/consents (grant ANALYTICS)', r);

    // 9. Withdraw MARKETING consent (TEST-003: consent enforcement)
    if (CONSENT_ID) {
        r = await req('POST', `/api/consents/${CONSENT_ID}/withdraw`, {}, TOKEN);
        pass(`POST /api/consents/${CONSENT_ID}/withdraw (consent enforcement test)`, r);
        console.log('   → MARKETING_PROCESSING event should now exist post-withdrawal');
    }

    // 10. Create order (TEST-001 + TEST-004: PII in logs + purpose mismatch)
    r = await req('POST', '/api/orders', {
        userId: 1, items: [{ productId: 1, quantity: 1 }],
        shippingAddress: '12 Demo St', shippingCity: 'Mumbai',
        shippingState: 'Maharashtra', shippingPostal: '400001'
    }, TOKEN);
    pass('POST /api/orders (PII log + purpose mismatch test)', r);
    const orderId = r.body?.orderId;

    // 11. Get order
    if (orderId) {
        r = await req('GET', `/api/orders/${orderId}`, null, TOKEN);
        pass(`GET /api/orders/${orderId}`, r);
    }

    // 12. User events
    r = await req('GET', '/api/users/1/events', null, TOKEN);
    pass('GET /api/users/1/events', r);
    if (r.body?.events) console.log('   → Event count:', r.body.events.length);

    // 13. Deletion request
    r = await req('POST', '/api/users/1/deletion-request', { reason: 'API test run' }, TOKEN);
    pass('POST /api/users/1/deletion-request', r);

    // 14. Admin login
    r = await req('POST', '/api/admin/login', { username: 'admin', password: 'password' });
    const adminOk = pass('POST /api/admin/login', r);
    if (adminOk) ADMIN_TOKEN = r.body.accessToken;

    // 15. Admin endpoints
    for (const [label, path] of [
        ['GET /api/admin/users',             '/api/admin/users'],
        ['GET /api/admin/orders',            '/api/admin/orders'],
        ['GET /api/admin/consents',          '/api/admin/consents'],
        ['GET /api/admin/events',            '/api/admin/events'],
        ['GET /api/admin/audit-logs',        '/api/admin/audit-logs'],
        ['GET /api/admin/deletion-requests', '/api/admin/deletion-requests'],
    ]) {
        r = await req('GET', path, null, ADMIN_TOKEN);
        pass(label, r);
    }

    // 16. Verify DPDPA test cases in DB
    console.log('\n--- DPDPA Test Case Verification ---');
    const eventsRes = await req('GET', '/api/admin/events?limit=200', null, ADMIN_TOKEN);
    const events = eventsRes.body?.events || [];
    const logsRes = await req('GET', '/api/admin/audit-logs?limit=200', null, ADMIN_TOKEN);
    const logs = logsRes.body?.logs || [];

    const hasMarketingPostWithdrawal = events.some(e =>
        e.eventType === 'MARKETING_PROCESSING' &&
        e.metadata && JSON.parse(e.metadata || '{}')?.trigger === 'POST_CONSENT_WITHDRAWAL'
    );
    console.log(`${hasMarketingPostWithdrawal ? '✅' : '❌'} TEST-003: MARKETING_PROCESSING after consent withdrawal`);

    const hasPIIInLogs = logs.some(l => l.message && l.message.includes('mobile='));
    console.log(`${hasPIIInLogs ? '✅' : '❌'} TEST-001: PII (mobile) found in audit logs`);

    const hasPurposeMismatch = events.some(e =>
        e.eventType === 'ORDER_CREATED' &&
        JSON.parse(e.dataFields || '[]').includes('mobileNumber')
    );
    console.log(`${hasPurposeMismatch ? '✅' : '❌'} TEST-004: mobileNumber in ORDER_CREATED event (purpose mismatch)`);

    const hasRetentionRecord = events.some(e =>
        e.eventId === 'evt-retention-test-001'
    );
    console.log(`${hasRetentionRecord ? '✅' : '❌'} TEST-005: Retention test record present in events`);

    console.log('\n========================================');
    console.log('  Test run complete!');
    console.log('========================================\n');
}

runTests().catch(e => console.error('Test error:', e.message));
