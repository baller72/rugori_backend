const router = require('express').Router();
const PaymentController = require('../../controllers/PaymentController');
const { authenticate, restrictTo } = require('../../middlewares/auth');
const { uploadPaymentProof, handleMulterError } = require('../../middlewares/upload');

// Routes protégées
router.use(authenticate);

// Routes client
router.post(
    '/order/:orderId/proof',
    uploadPaymentProof,
    handleMulterError,
    PaymentController.submitPaymentProof
);
router.get('/order/:orderId/proof', PaymentController.getOrderProof);

// Routes admin
router.get('/pending', restrictTo('admin'), PaymentController.getPendingProofs);
router.patch('/:proofId/validate', restrictTo('admin'), PaymentController.validatePaymentProof);

module.exports = router;