/**
 * @file validation.js
 * Input validation helpers for registration, orders, and consent operations.
 */

const validateRegistrationInput = (data) => {
    const { fullName, email, mobileNumber, password } = data;
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
        return 'Full name is required (minimum 2 characters).';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
        return 'A valid email address is required.';
    }
    const phoneDigits = (mobileNumber ? String(mobileNumber) : '').replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        return 'Mobile number must contain between 10 and 15 digits.';
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
        return 'Password must be at least 6 characters long.';
    }
    return null;
};

const validateOrderInput = (data) => {
    const { items, shippingAddress, shippingCity, shippingState, shippingPostal } = data;
    if (!Array.isArray(items) || items.length === 0) {
        return 'Order must contain at least one item.';
    }
    for (const item of items) {
        if (!item.productId || typeof item.productId !== 'number') {
            return 'Each item must have a valid numeric productId.';
        }
        if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
            return 'Each item quantity must be at least 1.';
        }
    }
    if (!shippingAddress || typeof shippingAddress !== 'string' || shippingAddress.trim().length < 3) {
        return 'Valid shipping address is required.';
    }
    if (!shippingCity || !shippingState || !shippingPostal) {
        return 'Shipping city, state, and postal code are required.';
    }
    return null;
};

const validateConsentInput = (purpose) => {
    const validPurposes = ['ACCOUNT_SERVICE', 'SERVICE_COMMUNICATION', 'MARKETING', 'ANALYTICS'];
    if (!purpose || !validPurposes.includes(purpose)) {
        return `Invalid consent purpose. Permitted purposes: ${validPurposes.join(', ')}`;
    }
    return null;
};

module.exports = {
    validateRegistrationInput,
    validateOrderInput,
    validateConsentInput
};
