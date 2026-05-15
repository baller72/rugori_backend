const PaymentProof = require('../models/PaymentProof');
const User = require('../models/User');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { PAYMENT_STATUS, ORDER_STATUS, AUDIT_ACTIONS, NOTIFICATION_TYPES } = require('../config/constants');
const EmailService = require('./EmailService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const db = require('../database/pool');

/**
 * Service de gestion des paiements
 */
class PaymentService {
    /**
     * Soumission d'une preuve de paiement
     */
    static async submitPaymentProof(orderId, userId, proofData, reqInfo = {}) {
        const { image_url, reference_number } = proofData;

        // Vérification que la commande existe et appartient à l'utilisateur
        const order = await Order.findById(orderId);
        
        if (!order) {
            throw new AppError('Commande non trouvée', 404);
        }

        if (order.user_id !== userId) {
            throw new AppError('Cette commande ne vous appartient pas', 403);
        }

        if (order.status !== ORDER_STATUS.PENDING_PAYMENT) {
            throw new AppError('Cette commande n\'est plus en attente de paiement', 400);
        }

        // Vérification si une preuve existe déjà
        const existingProof = await PaymentProof.findByOrder(orderId);
        if (existingProof && existingProof.status === PAYMENT_STATUS.PENDING) {
            throw new AppError('Une preuve de paiement est déjà en attente de validation', 400);
        }

        // Création de la preuve
        const proof = await PaymentProof.create({
            order_id: orderId,
            user_id: userId,
            image_url,
            reference_number
        });

        // Notification aux administrateurs
        await this.notifyAdminsNewPayment(order, proof);

        // Audit
        await AuditLog.create({
            user_id: userId,
            actor_id: userId,
            action: AUDIT_ACTIONS.SUBMIT_PAYMENT,
            entity_type: 'PaymentProof',
            entity_id: proof.id,
            new_values: { order_id: orderId, reference_number },
            ip_address: reqInfo.ip,
            user_agent: reqInfo.userAgent
        });

        logger.info(`Payment proof submitted for order ${order.order_number}`);

        return {
            message: 'Preuve de paiement soumise avec succès',
            proof_id: proof.id
        };
    }

    /**
     * Validation d'une preuve de paiement par admin
     */
    static async validatePaymentProof(proofId, adminId, decision, comment, reqInfo = {}) {
        const proof = await PaymentProof.findById(proofId);
        
        if (!proof) {
            throw new AppError('Preuve de paiement non trouvée', 404);
        }

        if (proof.status !== PAYMENT_STATUS.PENDING) {
            throw new AppError('Cette preuve a déjà été traitée', 400);
        }

        const order = await Order.findById(proof.order_id);
        
        if (!order) {
            throw new AppError('Commande associée non trouvée', 404);
        }

        const status = decision === 'approve' ? PAYMENT_STATUS.APPROVED : PAYMENT_STATUS.REJECTED;

        // Transaction
        await db.transaction(async (connection) => {
            // Mise à jour de la preuve
            await PaymentProof.updateStatus(proofId, status, adminId, comment);

            if (decision === 'approve') {
                // Mise à jour du statut de la commande
                await Order.updateStatus(order.id, ORDER_STATUS.PAYMENT_VERIFIED, adminId);
            }
        });

        // Notification au client
        const notificationTitle = decision === 'approve' 
            ? 'Paiement validé' 
            : 'Paiement rejeté';
        
        const notificationMessage = decision === 'approve'
            ? `Votre paiement pour la commande #${order.order_number} a été validé.`
            : `Votre preuve de paiement pour la commande #${order.order_number} a été rejetée. Raison: ${comment || 'Non conforme'}`;

        await Notification.create({
            user_id: order.user_id,
            title: notificationTitle,
            message: notificationMessage,
            type: NOTIFICATION_TYPES.PAYMENT,
            link: `/orders/${order.order_number}`
        });

        // Envoi email
        const user = await User.findById(order.user_id);
        if (user) {
            await EmailService.sendOrderStatusUpdate(
                user.email, 
                user.full_name, 
                order.order_number, 
                decision === 'approve' ? ORDER_STATUS.PAYMENT_VERIFIED : ORDER_STATUS.PENDING_PAYMENT
            );
        }

        // Audit
        await AuditLog.create({
            user_id: order.user_id,
            actor_id: adminId,
            action: decision === 'approve' ? AUDIT_ACTIONS.APPROVE_PAYMENT : AUDIT_ACTIONS.REJECT_PAYMENT,
            entity_type: 'PaymentProof',
            entity_id: proofId,
            new_values: { status, comment },
            ip_address: reqInfo.ip,
            user_agent: reqInfo.userAgent
        });

        logger.info(`Payment proof ${proofId} ${status} by admin ${adminId}`);

        return {
            message: `Paiement ${status === PAYMENT_STATUS.APPROVED ? 'approuvé' : 'rejeté'}`,
            status
        };
    }

    /**
     * Notification aux admins pour nouvelle preuve
     */
    static async notifyAdminsNewPayment(order, proof) {
        const sql = `SELECT id FROM users WHERE role = 'admin'`;
        const admins = await db.query(sql);

        const notifications = admins.map(admin => ({
            user_id: admin.id,
            title: 'Nouvelle preuve de paiement',
            message: `Commande #${order.order_number} - ${order.total_amount} BIF`,
            type: NOTIFICATION_TYPES.PAYMENT,
            link: `/admin/payments/${proof.id}`
        }));

        await Notification.createMany(notifications);
    }

    /**
     * Récupération des preuves en attente
     */
    static async getPendingProofs() {
        return await PaymentProof.findPending();
    }

    /**
     * Récupération de la preuve d'une commande
     */
    static async getOrderProof(orderId, userId, userRole) {
        const order = await Order.findById(orderId);
        
        if (!order) {
            throw new AppError('Commande non trouvée', 404);
        }

        // Vérification des droits
        const hasAccess = userRole === 'admin' || order.user_id === userId;
        if (!hasAccess) {
            throw new AppError('Accès non autorisé', 403);
        }

        return await PaymentProof.findByOrder(orderId);
    }
}

module.exports = PaymentService;