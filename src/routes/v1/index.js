const router = require('express').Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const orderRoutes = require('./orderRoutes');
const paymentRoutes = require('./paymentRoutes');
const deliveryRoutes = require('./deliveryRoutes');
const messageRoutes = require('./messageRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes = require('./adminRoutes');

// Montage des routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'RUGORI GAZ API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;