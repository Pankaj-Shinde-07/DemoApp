const { pool } = require('../models/db');
const { logInfo } = require('../utils/logger');
const { emitEvent } = require('../events/eventEmitter');

// ── Get All Products ──────────────────────────────────────────────────────────
const getProducts = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM products WHERE isActive = TRUE ORDER BY category, name');
        return res.status(200).json({ success: true, products: rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
    }
};

// ── Get Product By ID ─────────────────────────────────────────────────────────
const getProductById = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM products WHERE id = ? AND isActive = TRUE', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found.' });
        return res.status(200).json({ success: true, product: rows[0] });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch product.' });
    }
};

// ── Create Order ──────────────────────────────────────────────────────────────
const createOrder = async (req, res) => {
    const { userId, items, shippingAddress, shippingCity, shippingState, shippingPostal, notes } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.headers['user-agent'];

    if (!userId || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'userId and items are required.' });
    }

    try {
        // Fetch user for mobile — used in order event (intentional purpose mismatch)
        const [userRows] = await pool.execute('SELECT mobileNumber FROM users WHERE id = ?', [userId]);
        const mobileNumber = userRows.length > 0 ? userRows[0].mobileNumber : null;

        let totalAmount = 0;
        const resolvedItems = [];

        for (const item of items) {
            const [pRows] = await pool.execute('SELECT id, price FROM products WHERE id = ? AND isActive = TRUE', [item.productId]);
            if (pRows.length === 0) return res.status(400).json({ success: false, message: `Product ${item.productId} not found.` });
            const unitPrice = parseFloat(pRows[0].price);
            totalAmount += unitPrice * item.quantity;
            resolvedItems.push({ productId: item.productId, quantity: item.quantity, unitPrice });
        }

        const [orderResult] = await pool.execute(
            `INSERT INTO orders (userId, status, totalAmount, shippingAddress, shippingCity, shippingState, shippingPostal, notes)
             VALUES (?, 'PENDING', ?, ?, ?, ?, ?, ?)`,
            [userId, totalAmount, shippingAddress || null, shippingCity || null, shippingState || null, shippingPostal || null, notes || null]
        );

        const orderId = orderResult.insertId;

        for (const item of resolvedItems) {
            await pool.execute(
                'INSERT INTO order_items (orderId, productId, quantity, unitPrice) VALUES (?, ?, ?, ?)',
                [orderId, item.productId, item.quantity, item.unitPrice]
            );
        }

        // INTENTIONAL_DPDPA_TEST_CASE: PURPOSE_MISMATCH
        // mobileNumber is included in the ORDER_CREATED event.
        // Declared purpose for mobileNumber is "OTP verification" only.
        // Observed: used in order processing — purpose mismatch.
        await logInfo({
            action: 'ORDER_CREATED',
            userId,
            message: `Order created for userId=${userId} mobile=${mobileNumber}`,
            rawLogData: {
                userId,
                mobileNumber,
                orderId,
                note: 'INTENTIONAL_DPDPA_TEST_CASE: PII_IN_LOGS + PURPOSE_MISMATCH — mobile used in order log'
            },
            ipAddress: ip
        });

        await emitEvent({
            eventType: 'ORDER_CREATED',
            userId,
            dataFields: ['fullName', 'email', 'mobileNumber', 'shippingAddress'],
            purpose: 'ACCOUNT_SERVICE',
            ipAddress: ip,
            userAgent: ua,
            metadata: {
                orderId,
                totalAmount,
                note: 'INTENTIONAL_DPDPA_TEST_CASE: PURPOSE_MISMATCH — mobileNumber used in order processing; declared purpose is OTP verification only.'
            }
        });

        return res.status(201).json({ success: true, message: 'Order created successfully.', orderId, totalAmount });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to create order.' });
    }
};

// ── Get Order By ID ───────────────────────────────────────────────────────────
const getOrderById = async (req, res) => {
    const orderId = parseInt(req.params.id);
    const ip = req.ip || req.connection.remoteAddress;

    try {
        const [orders] = await pool.execute(
            `SELECT o.*, u.fullName, u.email FROM orders o JOIN users u ON o.userId = u.id WHERE o.id = ?`,
            [orderId]
        );
        if (orders.length === 0) return res.status(404).json({ success: false, message: 'Order not found.' });

        const [items] = await pool.execute(
            `SELECT oi.*, p.name as productName FROM order_items oi JOIN products p ON oi.productId = p.id WHERE oi.orderId = ?`,
            [orderId]
        );

        await emitEvent({ eventType: 'ORDER_VIEWED', userId: orders[0].userId, dataFields: ['fullName', 'email', 'shippingAddress'], purpose: 'ACCOUNT_SERVICE', ipAddress: ip });

        return res.status(200).json({ success: true, order: { ...orders[0], items } });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch order.' });
    }
};

module.exports = { getProducts, getProductById, createOrder, getOrderById };
