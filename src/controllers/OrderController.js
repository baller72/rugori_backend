const OrderService = require('../services/OrderService');
const Order = require("../models/Order")
const { createOrderSchema } = require('../utils/validationSchemas');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Contrôleur de commandes
 */
class OrderController {
    /**
     * Création d'une commande
     */
    static createOrder = asyncHandler(async (req, res) => {
        const { error, value } = createOrderSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const order = await OrderService.createOrder(req.user.id, value, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(201).json({
            status: 'success',
            data: { order }
        });
    });

    /**
     * Récupération des commandes de l'utilisateur
     */
    static getMyOrders = asyncHandler(async (req, res) => {
        const filters = {
            status: req.query.status,
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0
        };

        const orders = await OrderService.getUserOrders(req.user.id, filters);

        res.status(200).json({
            status: 'success',
            results: orders.length,
            data: { orders }
        });
    });

    /**
     * Récupération d'une commande spécifique
     */
    static getOrder = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const order = await OrderService.getOrderById(id, req.user.id, req.user.role);

        res.status(200).json({
            status: 'success',
            data: { order }
        });
    });

    /**
     * Mise à jour du statut d'une commande (admin/livreur)
     */
    static updateOrderStatus = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            throw new AppError('Statut requis', 400);
        }

        const result = await OrderService.updateOrderStatus(
            id, 
            status, 
            req.user.id, 
            req.user.role,
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
     * Annulation d'une commande
     */
    static cancelOrder = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;

        const result = await OrderService.cancelOrder(id, req.user.id, reason, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(200).json({
            status: 'success',
            data: result
        });
    });

    /**
     * Récupération de toutes les commandes (admin)
     */
    static getAllOrders = asyncHandler(async (req, res) => {
        const filters = {
            status: req.query.status,
            user_id: req.query.user_id,
            delivery_person_id: req.query.delivery_person_id,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
        };

        const orders = await Order.findAll(filters);

        res.status(200).json({
            status: 'success',
            results: orders.length,
            data: { orders }
        });
    });

    /**
     * Statistiques des commandes (admin)
     */
    static getOrderStats = asyncHandler(async (req, res) => {
        const stats = await OrderService.getOrderStats();

        res.status(200).json({
            status: 'success',
            data: { stats }
        });
    });
}

module.exports = OrderController;