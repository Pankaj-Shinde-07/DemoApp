/**
 * @file testMode.js
 * Controls test scenarios and intentionally unsafe behaviors.
 * Enabled only in development/test/staging environments, or when TEST_MODE=true.
 * Strictly disabled in production.
 */

const isTestMode = () => {
    if (process.env.TEST_MODE !== undefined) {
        return process.env.TEST_MODE === 'true';
    }
    return process.env.NODE_ENV !== 'production';
};

const maskPII = (val) => {
    if (!val || typeof val !== 'string') return val;
    if (val.includes('@')) {
        const [user, domain] = val.split('@');
        return `${user.slice(0, 2)}***@${domain}`;
    }
    if (val.length >= 10) {
        return `${val.slice(0, 2)}******${val.slice(-2)}`;
    }
    return '***';
};

module.exports = { isTestMode, maskPII };
