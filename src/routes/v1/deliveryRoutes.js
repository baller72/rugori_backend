const router = require('express').Router();
const DeliveryController = require('../../controllers/DeliveryController');
const { authenticate, restrictTo } = require('../../middlewares/auth');

// Routes protégées
router.use(authenticate);

// Validation par QR (peut être publique? Non, nécessite auth)
router.post('/validate/:qrToken', DeliveryController.validateDeliveryByQR);

// Routes livreur
router.get('/available', restrictTo('livreur', 'admin'), DeliveryController.getAvailableDeliveries);
router.get('/my-active', restrictTo('livreur'), DeliveryController.getMyActiveDeliveries);
router.get('/my-history', restrictTo('livreur'), DeliveryController.getMyDeliveryHistory);
router.post('/assign/:orderId', restrictTo('livreur'), DeliveryController.assignDelivery);
router.post('/:orderId/issue', restrictTo('livreur'), DeliveryController.reportDeliveryIssue);
router.patch('/availability', restrictTo('livreur'), DeliveryController.toggleAvailability);

// Routes client/admin/livreur
router.get('/:orderId/qrcode', DeliveryController.getDeliveryQRCode);

module.exports = router;