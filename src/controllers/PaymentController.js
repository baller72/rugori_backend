const PaymentService = require('../services/PaymentService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Contrôleur de paiements
 */
class PaymentController {
    /**
     * Soumission d'une preuve de paiement
     */
    static submitPaymentProof = asyncHandler(async (req, res) => {
        const { orderId } = req.params;
        const { reference_number } = req.body;

        if (!req.file) {
            throw new AppError('Image de preuve de paiement requise', 400);
        }

        const proofData = {
            image_url: `/uploads/payment-proofs/${req.file.filename}`,
            reference_number
        };

        const result = await PaymentService.submitPaymentProof(
            orderId, 
            req.user.id, 
            proofData,
            {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.status(201).json({
            status: 'success',
            data: result
        });
    });

    /**
     * Validation d'une preuve de paiement (admin)
     */
    static validatePaymentProof = asyncHandler(async (req, res) => {
        const { proofId } = req.params;
        const { decision, comment } = req.body;

        if (!decision || !['approve', 'reject'].includes(decision)) {
            throw new AppError('Décision invalide. Utilisez "approve" ou "reject".', 400);
        }

        const result = await PaymentService.validatePaymentProof(
            proofId,
            req.user.id,
            decision,
            comment,
            {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            }
        );

        res.status(200).json({
            status: 'success',
            data: result
        });
    });

    /**
     * Récupération des preuves en attente (admin)
     */
    static getPendingProofs = asyncHandler(async (req, res) => {
        const proofs = await PaymentService.getPendingProofs();

        res.status(200).json({
            status: 'success',
            results: proofs.length,
            data: { proofs }
        });
    });

    /**
     * Récupération de la preuve d'une commande
     */
    static getOrderProof = asyncHandler(async (req, res) => {
        const { orderId } = req.params;

        const proof = await PaymentService.getOrderProof(orderId, req.user.id, req.user.role);

        res.status(200).json({
            status: 'success',
            data: { proof }
        });
    });
}

module.exports = PaymentController;