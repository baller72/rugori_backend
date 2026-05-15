const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const QRCodeService = require('./QRCodeService');
const { ORDER_STATUS, AUDIT_ACTIONS, NOTIFICATION_TYPES, DELIVERY_VALIDATION_METHODS } = require('../config/constants');
const EmailService = require('./EmailService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const db = require('../config/database')

/**
 * Service de gestion des livraisons
 */
class DeliveryService {
    /**
     * Prise en charge d'une commande par un livreur
     */
    static async assignDelivery(orderId, deliveryPersonId, reqInfo = {}) {
        // Vérification de la commande
        const order = await Order.findById(orderId);
        
        if (!order) {
            throw new AppError('Commande non trouvée', 404);
        }

        if (order.status !== ORDER_STATUS.READY_FOR_DELIVERY) {
            throw new AppError('Cette commande n\'est pas prête pour livraison', 400);
        }

        // Vérification du livreur
        const livreur = await User.findById(deliveryPersonId);
        if (!livreur || livreur.role !== 'livreur') {
            throw new AppError('Livreur non trouvé', 404);
        }

        if (!livreur.is_available) {
            throw new AppError('Livreur non disponible', 400);
        }

        // Vérification si commande déjà prise
        const existingDelivery = await Delivery.findByOrder(orderId);
        if (existingDelivery && existingDelivery.delivery_person_id) {
            throw new AppError('Cette commande a déjà été prise en charge', 400);
        }

        // Assignation
        await Delivery.assignDeliveryPerson(orderId, deliveryPersonId);

        // Génération du QR Code
        const delivery = await Delivery.findByOrder(orderId);
        await QRCodeService.generateAndSaveQRCode(delivery.qr_code_token, orderId);

        // Notification au client
        await Notification.create({
            user_id: order.user_id,
            title: 'Commande en cours de livraison',
            message: `Votre commande #${order.order_number} est en cours de livraison par ${livreur.full_name}`,
            type: NOTIFICATION_TYPES.DELIVERY,
            link: `/orders/${order.order_number}`
        });

        // Envoi email au client
        const client = await User.findById(order.user_id);
        if (client) {
            await EmailService.sendOrderStatusUpdate(
                client.email,
                client.full_name,
                order.order_number,
                ORDER_STATUS.OUT_FOR_DELIVERY
            );
        }

        // Audit
        await AuditLog.create({
            user_id: order.user_id,
            actor_id: deliveryPersonId,
            action: AUDIT_ACTIONS.ASSIGN_DELIVERY,
            entity_type: 'Delivery',
            entity_id: delivery.id,
            new_values: { delivery_person_id: deliveryPersonId },
            ip_address: reqInfo.ip,
            user_agent: reqInfo.userAgent
        });

        logger.info(`Order ${order.order_number} assigned to delivery person ${deliveryPersonId}`);

        return {
            message: 'Commande prise en charge',
            qr_code_token: delivery.qr_code_token
        };
    }

    /**
     * Validation de livraison par scan QR
     */
    static async validateDeliveryByQR(qrToken, validationData, reqInfo = {}) {
        const { delivery_notes } = validationData;

        // Recherche de la livraison par token QR
        const delivery = await Delivery.findByQRToken(qrToken);
        
        if (!delivery) {
            throw new AppError('QR Code invalide', 400);
        }

        if (delivery.delivered_at) {
            throw new AppError('Cette commande a déjà été livrée', 400);
        }

        if (delivery.order_status !== ORDER_STATUS.OUT_FOR_DELIVERY) {
            throw new AppError('Cette commande n\'est pas en cours de livraison', 400);
        }

        // Validation
        await Delivery.validateDelivery(delivery.order_id, {
            validation_method: DELIVERY_VALIDATION_METHODS.QR_SCAN,
            delivery_notes
        });

        // Récupération des infos pour notifications
        const order = await Order.findById(delivery.order_id);

        // Notification au client
        await Notification.create({
            user_id: order.user_id,
            title: 'Commande livrée !',
            message: `Votre commande #${order.order_number} a été livrée avec succès. Merci de votre confiance !`,
            type: NOTIFICATION_TYPES.DELIVERY,
            link: `/orders/${order.order_number}`
        });

        // Envoi email de confirmation
        const client = await User.findById(order.user_id);
        if (client) {
            await EmailService.sendOrderStatusUpdate(
                client.email,
                client.full_name,
                order.order_number,
                ORDER_STATUS.DELIVERED
            );
        }

        // Audit
        await AuditLog.create({
            user_id: order.user_id,
            actor_id: delivery.delivery_person_id,
            action: AUDIT_ACTIONS.COMPLETE_DELIVERY,
            entity_type: 'Delivery',
            entity_id: delivery.id,
            new_values: { validation_method: 'qr_scan', delivery_notes },
            ip_address: reqInfo.ip,
            user_agent: reqInfo.userAgent
        });

        // Mise à jour disponibilité du livreur
        if (delivery.delivery_person_id) {
            await User.toggleAvailability(delivery.delivery_person_id, true);
        }

        logger.info(`Order ${order.order_number} delivered successfully`);

        return {
            message: 'Livraison validée avec succès',
            order_number: order.order_number
        };
    }

    /**
     * Récupération des commandes disponibles pour livraison
     */
    static async getAvailableDeliveries() {
        const orders = await Order.findReadyForDelivery();
        
        // Ajout des informations de distance (à implémenter avec géolocalisation)
        return orders.map(order => ({
            ...order,
            estimated_distance: null // À implémenter
        }));
    }

    /**
     * Historique des livraisons d'un livreur
     */
    static async getDeliveryPersonHistory(deliveryPersonId, limit = 50) {
        return await Delivery.getHistoryByPerson(deliveryPersonId, limit);
    }

    /**
     * Récupération du QR Code d'une commande
     */
    static async getDeliveryQRCode(orderId, userId, userRole) {
        const order = await Order.findById(orderId);
        
        if (!order) {
            throw new AppError('Commande non trouvée', 404);
        }

        // Vérification des droits
        const hasAccess = userRole === 'admin' || 
                         userRole === 'livreur' || 
                         order.user_id === userId;

        if (!hasAccess) {
            throw new AppError('Accès non autorisé', 403);
        }

        const delivery = await Delivery.findByOrder(orderId);
        
        if (!delivery) {
            throw new AppError('Livraison non trouvée', 404);
        }

        // Génération ou récupération du QR Code
        const qrCodeUrl = await QRCodeService.getQRCodeUrl(delivery.qr_code_token, orderId);

        return {
            qr_code_token: delivery.qr_code_token,
            qr_code_url: qrCodeUrl,
            status: order.status
        };
    }

    /**
     * Signalement d'un problème de livraison
     */
    static async reportDeliveryIssue(orderId, deliveryPersonId, issue, reqInfo = {}) {
        const order = await Order.findById(orderId);
        
        if (!order) {
            throw new AppError('Commande non trouvée', 404);
        }

        const delivery = await Delivery.findByOrder(orderId);
        
        if (!delivery || delivery.delivery_person_id !== deliveryPersonId) {
            throw new AppError('Vous n\'êtes pas assigné à cette commande', 403);
        }

        // Mise à jour statut
        await Order.updateStatus(orderId, ORDER_STATUS.FAILED_DELIVERY, deliveryPersonId);

        // Ajout note de livraison
        const updateDeliverySql = `
            UPDATE deliveries 
            SET delivery_notes = ? 
            WHERE order_id = ?
        `;
        await db.query(updateDeliverySql, [`Problème signalé: ${issue}`, orderId]);

        // Notification aux administrateurs
        const sql = `SELECT id FROM users WHERE role = 'admin'`;
        const admins = await db.query(sql);

        const notifications = admins.map(admin => ({
            user_id: admin.id,
            title: 'Problème de livraison',
            message: `Commande #${order.order_number} - ${issue}`,
            type: NOTIFICATION_TYPES.DELIVERY,
            link: `/admin/orders/${orderId}`
        }));

        await Notification.createMany(notifications);

        // Audit
        await AuditLog.create({
            user_id: order.user_id,
            actor_id: deliveryPersonId,
            action: AUDIT_ACTIONS.DELIVERY_ISSUE,
            entity_type: 'Delivery',
            entity_id: delivery.id,
            new_values: { issue },
            ip_address: reqInfo.ip,
            user_agent: reqInfo.userAgent
        });

        logger.warn(`Delivery issue reported for order ${order.order_number}: ${issue}`);

        return { message: 'Problème signalé, un administrateur va vous contacter' };
    }
}

module.exports = DeliveryService;