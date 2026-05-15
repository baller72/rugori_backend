const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { messageSchema } = require('../utils/validationSchemas');
const { NOTIFICATION_TYPES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Contrôleur de messagerie
 */
class MessageController {
    /**
     * Envoi d'un message
     */
    static sendMessage = asyncHandler(async (req, res) => {
        const { error, value } = messageSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const { order_id, message, attachment_url } = value;

        // Vérification des droits d'accès à la commande
        const order = await Order.findById(order_id);
        if (!order) {
            throw new AppError('Commande non trouvée', 404);
        }

        // Vérifier que l'utilisateur est impliqué dans la commande
        const hasAccess = req.user.role === 'admin' || 
                         order.user_id === req.user.id ||
                         (req.user.role === 'livreur' && await this.isDeliveryPerson(order_id, req.user.id));

        if (!hasAccess) {
            throw new AppError('Vous n\'avez pas accès à cette commande', 403);
        }

        // Création du message
        const newMessage = await Message.create({
            order_id,
            sender_id: req.user.id,
            message,
            attachment_url
        });

        // Notification au destinataire
        const recipientId = this.determineRecipient(order, req.user);
        if (recipientId) {
            await Notification.create({
                user_id: recipientId,
                title: 'Nouveau message',
                message: `Nouveau message concernant la commande #${order.order_number}`,
                type: NOTIFICATION_TYPES.MESSAGE,
                link: `/orders/${order_id}/messages`
            });
        }

        logger.info(`Message sent by user ${req.user.id} on order ${order_id}`);

        res.status(201).json({
            status: 'success',
            data: { message: newMessage }
        });
    });

    /**
     * Récupération des messages d'une commande
     */
    static getOrderMessages = asyncHandler(async (req, res) => {
        const { orderId } = req.params;
        const limit = parseInt(req.query.limit) || 100;

        // Vérification des droits
        const order = await Order.findById(orderId);
        if (!order) {
            throw new AppError('Commande non trouvée', 404);
        }

        const hasAccess = req.user.role === 'admin' || 
                         order.user_id === req.user.id ||
                         (req.user.role === 'livreur' && await this.isDeliveryPerson(orderId, req.user.id));

        if (!hasAccess) {
            throw new AppError('Accès non autorisé', 403);
        }

        const messages = await Message.findByOrder(orderId, limit);

        // Marquer comme lus pour l'utilisateur courant
        await Message.markAsRead(orderId, req.user.id);

        res.status(200).json({
            status: 'success',
            results: messages.length,
            data: { messages }
        });
    });

    /**
     * Récupération des conversations de l'utilisateur
     */
    static getMyConversations = asyncHandler(async (req, res) => {
        const sql = `
            SELECT DISTINCT 
                o.id as order_id,
                o.order_number,
                o.status,
                o.created_at,
                (SELECT COUNT(*) FROM messages m2 
                 WHERE m2.order_id = o.id 
                   AND m2.sender_id != ? 
                   AND m2.is_read = FALSE) as unread_count,
                (SELECT message FROM messages m3 
                 WHERE m3.order_id = o.id 
                 ORDER BY m3.created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM messages m4 
                 WHERE m4.order_id = o.id 
                 ORDER BY m4.created_at DESC LIMIT 1) as last_message_at
            FROM orders o
            JOIN messages m ON o.id = m.order_id
            WHERE o.user_id = ? OR EXISTS (
                SELECT 1 FROM deliveries d 
                WHERE d.order_id = o.id AND d.delivery_person_id = ?
            )
            ORDER BY last_message_at DESC
        `;

        const conversations = await db.query(sql, [req.user.id, req.user.id, req.user.id]);

        res.status(200).json({
            status: 'success',
            results: conversations.length,
            data: { conversations }
        });
    });

    /**
     * Marquer un message comme lu
     */
    static markAsRead = asyncHandler(async (req, res) => {
        const { messageId } = req.params;

        const sql = `
            UPDATE messages 
            SET is_read = TRUE 
            WHERE id = ? AND sender_id != ?
        `;
        await db.query(sql, [messageId, req.user.id]);

        res.status(200).json({
            status: 'success',
            data: { message: 'Message marqué comme lu' }
        });
    });

    /**
     * Marquer tous les messages d'une commande comme lus
     */
    static markAllAsRead = asyncHandler(async (req, res) => {
        const { orderId } = req.params;

        const count = await Message.markAsRead(orderId, req.user.id);

        res.status(200).json({
            status: 'success',
            data: { 
                message: `${count} message(s) marqué(s) comme lu(s)`,
                marked_count: count
            }
        });
    });

    /**
     * Compteur de messages non lus
     */
    static getUnreadCount = asyncHandler(async (req, res) => {
        const count = await Message.countUnread(req.user.id);

        res.status(200).json({
            status: 'success',
            data: { unread_count: count }
        });
    });

    /**
     * Helper: Vérifier si l'utilisateur est le livreur assigné
     */
    static async isDeliveryPerson(orderId, userId) {
        const sql = `
            SELECT 1 FROM deliveries 
            WHERE order_id = ? AND delivery_person_id = ?
        `;
        const result = await db.queryOne(sql, [orderId, userId]);
        return !!result;
    }

    /**
     * Helper: Déterminer le destinataire du message
     */
    static determineRecipient(order, sender) {
        if (sender.role === 'client') {
            // Message au livreur assigné ou aux admins
            return null; // Sera géré par notification multiple
        } else if (sender.role === 'livreur') {
            // Message au client
            return order.user_id;
        } else {
            // Admin -> client ou livreur
            return order.user_id;
        }
    }
}

module.exports = MessageController;