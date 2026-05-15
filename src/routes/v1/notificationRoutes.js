const router = require('express').Router();
const NotificationController = require('../../controllers/NotificationController');
const { authenticate } = require('../../middlewares/auth');

// Toutes les routes nécessitent authentification
router.use(authenticate);

router.get('/', NotificationController.getMyNotifications);
router.get('/unread/count', NotificationController.getUnreadCount);
router.patch('/:id/read', NotificationController.markAsRead);
router.patch('/read-all', NotificationController.markAllAsRead);
router.delete('/:id', NotificationController.deleteNotification);

module.exports = router;