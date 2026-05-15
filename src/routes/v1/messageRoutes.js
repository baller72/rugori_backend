const router = require('express').Router();
const MessageController = require('../../controllers/MessageController');
const { authenticate } = require('../../middlewares/auth');
const { upload } = require('../../middlewares/upload');

// Toutes les routes nécessitent authentification
router.use(authenticate);

router.post('/', MessageController.sendMessage);
router.get('/conversations', MessageController.getMyConversations);
router.get('/unread/count', MessageController.getUnreadCount);
router.get('/order/:orderId', MessageController.getOrderMessages);
router.patch('/:messageId/read', MessageController.markAsRead);
router.patch('/order/:orderId/read-all', MessageController.markAllAsRead);

module.exports = router;