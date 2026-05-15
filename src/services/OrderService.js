const User = require('../models/User');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const Delivery = require('../models/Delivery');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const db = require('../database/pool');
const { getNextOrderSequence } = require('../utils/orderNumberGenerator');
const { ORDER_STATUS, AUDIT_ACTIONS, NOTIFICATION_TYPES } = require('../config/constants');
const EmailService = require('./EmailService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Service de gestion des commandes
 */
class OrderService {
    /**
     * Création d'une nouvelle commande
     */
    static async createOrder(userId, orderData, reqInfo = {}) {
        const { delivery_address, delivery_notes, recipient_name, recipient_phone, items } = orderData;

        // Validation des produits et calcul du total
        let subtotal = 0;
        const validatedItems = [];

        for (const item of items) {
            const product = await Product.findById(item.product_id);

            if (!product) {
                throw new AppError(`Produit #${item.product_id} non trouvé`, 404);
            }

            if (product.stock_quantity < item.quantity) {
                throw new AppError(`Stock insuffisant pour ${product.name}`, 400);
            }

            const total_price = product.price * item.quantity;
            subtotal += total_price;

            validatedItems.push({
                product_id: product.id,
                quantity: item.quantity,
                unit_price: product.price,
                total_price
            });
        }

        // Frais de livraison (à définir selon la logique métier)
        const delivery_fee = this.calculateDeliveryFee(delivery_address);
        const total_amount = subtotal + delivery_fee;

        // Transaction pour créer la commande
        const result = await db.transaction(async (connection) => {
            // Génération numéro de commande
            const { orderNumber } = await getNextOrderSequence(connection);

            // Création de la commande
            const order = await Order.create({
                order_number: orderNumber,
                user_id: userId,
                delivery_address,
                delivery_notes,
                recipient_name,
                recipient_phone,
                subtotal,
                delivery_fee,
                total_amount
            }, connection);

            // Création des lignes de commande
            for (const item of validatedItems) {
                await OrderItem.create({
                    order_id: order.id,
                    ...item
                }, connection);

                // Décrémentation du stock
                await Product.decrementStock(item.product_id, item.quantity, connection);
            }

            // Création de l'entrée de livraison avec QR Code
            await Delivery.create(order.id, connection);

            return order;
        });

        // Création de la notification
        await Notification.create({
            user_id: userId,
            title: 'Commande confirmée',
            message: `Votre commande #${result.order_number} a été enregistrée. Veuillez procéder au paiement.`,
            type: NOTIFICATION_TYPES.ORDER_STATUS,
            link: `/orders/${result.order_number}`
        });

        // Notification aux administrateurs
        await this.notifyAdminsNewOrder(result);

        // Audit
        await AuditLog.create({
            user_id: userId,
            actor_id: userId,
            action: AUDIT_ACTIONS.CREATE_ORDER,
            entity_type: 'Order',
            entity_id: result.id,
            new_values: { order_number: result.order_number, total_amount },
            ip_address: reqInfo.ip,
            user_agent: reqInfo.userAgent
        });

        logger.info(`Order created: ${result.order_number} by user ${userId}`);

        return {
            ...result,
            items: validatedItems
        };
    }

    /**
     * Calcul des frais de livraison
     */
    static calculateDeliveryFee(address) {
        // Logique à implémenter selon les zones de livraison
        // Pour l'instant, frais fixe
        return 5000; // 5000 BIF
    }

    /**
     * Notification aux administrateurs pour nouvelle commande
     */
    static async notifyAdminsNewOrder(order) {
        const sql = `SELECT id FROM users WHERE role = 'admin'`;
        const admins = await db.query(sql);

        const notifications = admins.map(admin => ({
            user_id: admin.id,
            title: 'Nouvelle commande',
            message: `Nouvelle commande #${order.order_number} de ${order.total_amount} BIF`,
            type: NOTIFICATION_TYPES.ORDER_STATUS,
            link: `/admin/orders/${order.id}`
        }));

        await Notification.createMany(notifications);
    }

    /**
     * Récupération des commandes d'un utilisateur
     */
    static async getUserOrders(userId, filters = {}) {
        return await Order.findByUser(userId, filters);
    }

    /**
     * Récupération d'une commande par ID (avec vérification d'accès)
     */
    static async getOrderById(orderId, userId, userRole) {
        const order = await Order.findById(orderId);
        
        if (!order) {
            throw new AppError('Commande non trouvée', 404);
        }

        // Vérification des droits d'accès
        const hasAccess = userRole === 'admin' || 
                         userRole === 'livreur' || 
                         order.user_id === userId;

        if (!hasAccess) {
            throw new AppError('Accès non autorisé à cette commande', 403);
        }

        // Récupération des items
        const items = await OrderItem.findByOrder(orderId);

        return {
            ...order,
            items
        };
    }

    /**
     * Mise à jour du statut d'une commande
     */
    static async updateOrderStatus(orderId, status, userId, userRole, reqInfo = {}) {
        const order = await Order.findById(orderId);
        
        if (!order) {
            throw new AppError('Commande non trouvée', 404);
        }

        // Vérification des transitions de statut valides
        if (!this.isValidStatusTransition(order.status, status, userRole)) {
            throw new AppError('Transition de statut non autorisée', 400);
        }

        // Mise à jour du statut
        await Order.updateStatus(orderId, status, userId);

        // Actions spécifiques selon le nouveau statut
        if (status === ORDER_STATUS.READY_FOR_DELIVERY) {
            await this.notifyAvailableLivreurs(order);
        }

        // Notification au client
        await Notification.create({
            user_id: order.user_id,
            title: 'Statut de commande mis à jour',
            message: `Votre commande #${order.order_number} est maintenant "${this.getStatusLabel(status)}"`,
            type: NOTIFICATION_TYPES.ORDER_STATUS,
            link: `/orders/${order.order_number}`
        });

        // Envoi email
        const user = await User.findById(order.user_id);
        if (user) {
            await EmailService.sendOrderStatusUpdate(user.email, user.full_name, order.order_number, status);
        }

        // Audit
        await AuditLog.create({
            user_id: order.user_id,
            actor_id: userId,
            action: AUDIT_ACTIONS.UPDATE_ORDER_STATUS,
            entity_type: 'Order',
            entity_id: orderId,
            old_values: { status: order.status },
            new_values: { status },
            ip_address: reqInfo.ip,
            user_agent: reqInfo.userAgent
        });

        logger.info(`Order ${order.order_number} status updated to ${status} by user ${userId}`);

        return { message: 'Statut mis à jour', status };
    }

    /**
     * Vérifie si une transition de statut est valide
     */
    static isValidStatusTransition(currentStatus, newStatus, userRole) {
        const transitions = {
            [ORDER_STATUS.PENDING_PAYMENT]: [ORDER_STATUS.PAYMENT_VERIFIED, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.PAYMENT_VERIFIED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY_FOR_DELIVERY, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.READY_FOR_DELIVERY]: [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.CANCELLED],
            [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.FAILED_DELIVERY],
            [ORDER_STATUS.FAILED_DELIVERY]: [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.CANCELLED]
        };

        // Les admins peuvent faire plus de transitions
        if (userRole === 'admin') {
            return true;
        }

        return transitions[currentStatus]?.includes(newStatus) || false;
    }

    /**
     * Traduction des statuts
     */
    static getStatusLabel(status) {
        const labels = {
            [ORDER_STATUS.PENDING_PAYMENT]: 'En attente de paiement',
            [ORDER_STATUS.PAYMENT_VERIFIED]: 'Paiement validé',
            [ORDER_STATUS.PREPARING]: 'En préparation',
            [ORDER_STATUS.READY_FOR_DELIVERY]: 'Prête pour livraison',
            [ORDER_STATUS.OUT_FOR_DELIVERY]: 'En cours de livraison',
            [ORDER_STATUS.DELIVERED]: 'Livrée',
            [ORDER_STATUS.CANCELLED]: 'Annulée',
            [ORDER_STATUS.FAILED_DELIVERY]: 'Échec de livraison'
        };
        return labels[status] || status;
    }

    /**
     * Notification aux livreurs disponibles
     */
    static async notifyAvailableLivreurs(order) {
        const livreurs = await User.findAvailableLivreurs();

        const notifications = livreurs.map(livreur => ({
            user_id: livreur.id,
            title: 'Nouvelle commande à livrer',
            message: `Commande #${order.order_number} prête pour livraison à ${order.delivery_address}`,
            type: NOTIFICATION_TYPES.DELIVERY,
            link: `/livreur/orders/${order.id}`
        }));

        await Notification.createMany(notifications);
    }

    /**
     * Annulation de commande
     */
    static async cancelOrder(orderId, userId, reason, reqInfo = {}) {
        const order = await Order.findById(orderId);
        
        if (!order) {
            throw new AppError('Commande non trouvée', 404);
        }

        // Vérification si annulable
        const nonCancellableStatuses = [ORDER_STATUS.DELIVERED, ORDER_STATUS.OUT_FOR_DELIVERY];
        if (nonCancellableStatuses.includes(order.status)) {
            throw new AppError('Cette commande ne peut plus être annulée', 400);
        }

        // Transaction pour annulation et restitution du stock
        await db.transaction(async (connection) => {
            // Mise à jour statut
            await Order.updateStatus(orderId, ORDER_STATUS.CANCELLED, userId);

            // Récupération des items pour restitution stock
            const items = await OrderItem.findByOrder(orderId);
            
            for (const item of items) {
                const updateStockSql = `
                    UPDATE products 
                    SET stock_quantity = stock_quantity + ? 
                    WHERE id = ?
                `;
                await connection.execute(updateStockSql, [item.quantity, item.product_id]);
            }
        });

        // Notification
        await Notification.create({
            user_id: order.user_id,
            title: 'Commande annulée',
            message: `Votre commande #${order.order_number} a été annulée. ${reason || ''}`,
            type: NOTIFICATION_TYPES.ORDER_STATUS,
            link: `/orders/${order.order_number}`
        });

        // Audit
        await AuditLog.create({
            user_id: order.user_id,
            actor_id: userId,
            action: AUDIT_ACTIONS.CANCEL_ORDER,
            entity_type: 'Order',
            entity_id: orderId,
            new_values: { reason },
            ip_address: reqInfo.ip,
            user_agent: reqInfo.userAgent
        });

        return { message: 'Commande annulée' };
    }

    /**
     * Statistiques des commandes
     */
    static async getOrderStats(filters = {}) {
        return await Order.getStats();
    }
}

module.exports = OrderService;