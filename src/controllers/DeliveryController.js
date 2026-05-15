const DeliveryService = require('../services/DeliveryService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const User = require('../models/User')
const Order = require('../models/Order')

/**
 * Contrôleur de livraisons
 */
class DeliveryController {
    /**
     * Récupération des commandes disponibles pour livraison (livreur)
     */
    static getAvailableDeliveries = asyncHandler(async (req, res) => {
        const deliveries = await DeliveryService.getAvailableDeliveries();

        res.status(200).json({
            status: 'success',
            results: deliveries.length,
            data: { deliveries }
        });
    });

    /**
     * Prise en charge d'une commande (livreur)
     */
    static assignDelivery = asyncHandler(async (req, res) => {
        const { orderId } = req.params;

        const result = await DeliveryService.assignDelivery(
            orderId,
            req.user.id,
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
     * Validation de livraison par QR Code
     */
    static validateDeliveryByQR = asyncHandler(async (req, res) => {
        const { qrToken } = req.params;
        const { delivery_notes } = req.body;

        const result = await DeliveryService.validateDeliveryByQR(
            qrToken,
            { delivery_notes },
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
     * Récupération du QR Code d'une commande
     */
    static getDeliveryQRCode = asyncHandler(async (req, res) => {
        const { orderId } = req.params;

        const qrCode = await DeliveryService.getDeliveryQRCode(
            orderId,
            req.user.id,
            req.user.role
        );

        res.status(200).json({
            status: 'success',
            data: qrCode
        });
    });

    /**
     * Historique des livraisons du livreur connecté
     */
    static getMyDeliveryHistory = asyncHandler(async (req, res) => {
        const limit = parseInt(req.query.limit) || 50;

        const history = await DeliveryService.getDeliveryPersonHistory(req.user.id, limit);

        res.status(200).json({
            status: 'success',
            results: history.length,
            data: { history }
        });
    });

    /**
     * Commandes actives du livreur
     */
    static getMyActiveDeliveries = asyncHandler(async (req, res) => {
        const activeDeliveries = await Order.findActiveDeliveries(req.user.id);

        res.status(200).json({
            status: 'success',
            results: activeDeliveries.length,
            data: { active_deliveries: activeDeliveries }
        });
    });

    /**
     * Signalement d'un problème de livraison
     */
    static reportDeliveryIssue = asyncHandler(async (req, res) => {
        const { orderId } = req.params;
        const { issue } = req.body;

        if (!issue) {
            throw new AppError('Description du problème requise', 400);
        }

        const result = await DeliveryService.reportDeliveryIssue(
            orderId,
            req.user.id,
            issue,
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
     * Bascule de disponibilité du livreur
     */
    static toggleAvailability = asyncHandler(async (req, res) => {
        const { is_available } = req.body;

        if (is_available === undefined) {
            throw new AppError('Statut de disponibilité requis', 400);
        }

        await User.toggleAvailability(req.user.id, is_available);

        res.status(200).json({
            status: 'success',
            data: {
                is_available,
                message: `Vous êtes maintenant ${is_available ? 'disponible' : 'indisponible'}`
            }
        });
    });
}

module.exports = DeliveryController;