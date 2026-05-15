const router = require('express').Router();
const AuthController = require('../../controllers/AuthController');
const { authenticate } = require('../../middlewares/auth');
const { authLimiter } = require('../../middlewares/rateLimiter');

// Routes publiques
router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/resend-otp', AuthController.resendOTP);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Routes protégées
router.use(authenticate);
router.get('/me', AuthController.getMe);
router.post('/logout', AuthController.logout);
router.post('/change-password', AuthController.changePassword);

module.exports = router;