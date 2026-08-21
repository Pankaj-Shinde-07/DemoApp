const router = require('express').Router();
const { getProducts, getProductById, createOrder, getOrderById } = require('../controllers/productOrderController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/products',        getProducts);
router.get('/products/:id',    getProductById);
router.post('/orders',         authMiddleware, createOrder);
router.get('/orders/:id',      authMiddleware, getOrderById);

module.exports = router;
