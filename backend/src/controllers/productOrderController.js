const { pool } = require('../models/db');
const { logInfo, logWithPII } = require('../utils/logger');
const { emitEvent } = require('../events/eventEmitter');
const { validateOrderInput } = require('../utils/validation');
const { isTestMode } = require('../utils/testMode');

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
    // 1. Input Validation
    const validationError = validateOrderInput(req.body);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    const { items, shippingAddress, shippingCity, shippingState, shippingPostal, notes } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.headers['user-agent'];

    // 2. Enforce User Ownership (User can only create orders for themselves, unless Admin)
    const orderUserId = req.user && req.user.isAdmin && req.body.userId
        ? parseInt(req.body.userId)
        : req.user.userId;

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Fetch user for verification
        const [userRows] = await conn.execute('SELECT mobileNumber FROM users WHERE id = ?', [orderUserId]);
        const mobileNumber = userRows.length > 0 ? userRows[0].mobileNumber : null;

        let totalAmount = 0;
        const resolvedItems = [];

        for (const item of items) {
            const [pRows] = await conn.execute('SELECT id, price FROM products WHERE id = ? AND isActive = TRUE', [item.productId]);
            if (pRows.length === 0) {
                await conn.rollback();
                return res.status(400).json({ success: false, message: `Product ${item.productId} not found.` });
            }
            const unitPrice = parseFloat(pRows[0].price);
            totalAmount += unitPrice * item.quantity;
            resolvedItems.push({ productId: item.productId, quantity: item.quantity, unitPrice });
        }

        const [orderResult] = await conn.execute(
            `INSERT INTO orders (userId, status, totalAmount, shippingAddress, shippingCity, shippingState, shippingPostal, notes)
             VALUES (?, 'PENDING', ?, ?, ?, ?, ?, ?)`,
            [orderUserId, totalAmount, shippingAddress.trim(), shippingCity.trim(), shippingState.trim(), shippingPostal.trim(), notes || null]
        );

        const orderId = orderResult.insertId;

        for (const item of resolvedItems) {
            await conn.execute(
                'INSERT INTO order_items (orderId, productId, quantity, unitPrice) VALUES (?, ?, ?, ?)',
                [orderId, item.productId, item.quantity, item.unitPrice]
            );
        }

        // Commit transaction atomically
        await conn.commit();

        // 3. Telemetry and Logging (Controlled Test vs Production behavior)
        if (isTestMode()) {
            // INTENTIONAL_DPDPA_TEST_CASE: PURPOSE_MISMATCH in test mode
            await logInfo({
                action: 'ORDER_CREATED',
                userId: orderUserId,
                message: `Order created for userId=${orderUserId} mobile=${mobileNumber}`,
                rawLogData: {
                    userId: orderUserId,
                    mobileNumber,
                    orderId,
                    note: 'INTENTIONAL_DPDPA_TEST_CASE: PII_IN_LOGS + PURPOSE_MISMATCH — mobile used in order log'
                },
                ipAddress: ip
            });

            await emitEvent({
                eventType: 'ORDER_CREATED',
                userId: orderUserId,
                dataFields: ['fullName', 'email', 'mobileNumber', 'shippingAddress'],
                purpose: 'ACCOUNT_SERVICE',
                ipAddress: ip,
                userAgent: ua,
                metadata: {
                    orderId,
                    totalAmount,
                    note: 'INTENTIONAL_DPDPA_TEST_CASE: PURPOSE_MISMATCH — mobileNumber used in order processing'
                }
            });
        } else {
            // Production: Strict Purpose Limitation & PII Sanitization
            await logInfo({
                action: 'ORDER_CREATED',
                userId: orderUserId,
                message: `Order #${orderId} created successfully.`,
                rawLogData: { orderId, totalAmount },
                ipAddress: ip
            });

            await emitEvent({
                eventType: 'ORDER_CREATED',
                userId: orderUserId,
                dataFields: ['shippingAddress'],
                purpose: 'ORDER_FULFILLMENT',
                ipAddress: ip,
                userAgent: ua,
                metadata: { orderId, totalAmount }
            });
        }

        return res.status(201).json({ success: true, message: 'Order created successfully.', orderId, totalAmount });
    } catch (err) {
        if (conn) {
            try { await conn.rollback(); } catch (_) {}
        }
        return res.status(500).json({ success: false, message: 'Failed to create order. Transaction rolled back.' });
    } finally {
        if (conn) conn.release();
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

        const order = orders[0];

        // Enforce User Ownership: Users can only view their own orders
        if (!req.user.isAdmin && order.userId !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You do not have permission to view this order.'
            });
        }

        const [items] = await pool.execute(
            `SELECT oi.*, p.name as productName FROM order_items oi JOIN products p ON oi.productId = p.id WHERE oi.orderId = ?`,
            [orderId]
        );

        await emitEvent({ eventType: 'ORDER_VIEWED', userId: order.userId, dataFields: ['fullName', 'email', 'shippingAddress'], purpose: 'ACCOUNT_SERVICE', ipAddress: ip });

        return res.status(200).json({ success: true, order: { ...order, items } });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch order.' });
    }
};

module.exports = { getProducts, getProductById, createOrder, getOrderById };
