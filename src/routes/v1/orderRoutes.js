const router = require('express').Router();
const OrderController = require('../../controllers/OrderController');
const { authenticate, restrictTo } = require('../../middlewares/auth');
const { orderLimiter } = require('../../middlewares/rateLimiter');

// Toutes les routes nécessitent authentification
router.use(authenticate);

// Routes client
router.post('/', orderLimiter, OrderController.createOrder);
router.get('/my-orders', OrderController.getMyOrders);
router.get('/:id', OrderController.getOrder);
router.post('/:id/cancel', OrderController.cancelOrder);

// Routes admin/livreur
router.patch('/:id/status', restrictTo('admin', 'livreur'), OrderController.updateOrderStatus);

// Routes admin uniquement
router.get('/', restrictTo('admin'), OrderController.getAllOrders);
router.get('/stats/summary', restrictTo('admin'), OrderController.getOrderStats);

module.exports = router;