const router = require('express').Router();
const AdminController = require('../../controllers/AdminController');
const { authenticate, restrictTo } = require('../../middlewares/auth');

// Routes admin uniquement
router.use(authenticate, restrictTo('admin'));

router.get('/dashboard/stats', AdminController.getDashboardStats);
router.get('/audit-logs', AdminController.getAuditLogs);
router.get('/audit-logs/:entityType/:entityId', AdminController.getEntityHistory);
router.get('/system/config', AdminController.getSystemConfig);
router.get('/reports/activity', AdminController.getActivityReport);

module.exports = router;