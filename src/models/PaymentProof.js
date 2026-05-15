const db = require('../database/pool');
const { PAYMENT_STATUS } = require('../config/constants');

/**
 * Modèle Preuve de paiement
 */
class PaymentProof {
    /**
     * Crée une preuve de paiement
     */
    static async create(data) {
        const { order_id, user_id, image_url, reference_number } = data;

        const sql = `
            INSERT INTO payment_proofs (
                order_id, user_id, image_url, reference_number, status
            ) VALUES (?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            order_id, user_id, image_url, reference_number || null,
            PAYMENT_STATUS.PENDING
        ]);

        return { id: result.insertId, ...data };
    }

    /**
     * Trouve la preuve de paiement d'une commande par id
     */
    static async findById(paymentId) {
        const sql = `
            SELECT pp.*, u.full_name as reviewer_name
            FROM payment_proofs pp
            LEFT JOIN users u ON pp.reviewed_by = u.id
            WHERE pp.id = ?
            ORDER BY pp.created_at DESC
        `;
        return await db.queryOne(sql, [paymentId]);
    }

    /**
     * Trouve la preuve de paiement d'une commande par commande
     */
    static async findByOrder(orderId) {
        const sql = `
            SELECT pp.*, u.full_name as reviewer_name
            FROM payment_proofs pp
            LEFT JOIN users u ON pp.reviewed_by = u.id
            WHERE pp.order_id = ?
            ORDER BY pp.created_at DESC
        `;
        return await db.queryOne(sql, [orderId]);
    }

    /**
     * Met à jour le statut de la preuve
     */
    static async updateStatus(id, status, reviewerId, comment = null) {
        const updates = {
            status,
            reviewed_by: reviewerId,
            reviewed_at: new Date()
        };
        
        if (comment) {
            updates.admin_comment = comment;
        }

        return await db.update('payment_proofs', updates, 'id = ?', [id]);
    }

    /**
     * Récupère toutes les preuves en attente
     */
    static async findPending() {
        const sql = `
            SELECT pp.*, 
                   o.order_number, o.total_amount,
                   u.full_name as customer_name
            FROM payment_proofs pp
            JOIN orders o ON pp.order_id = o.id
            JOIN users u ON pp.user_id = u.id
            WHERE pp.status = ?
            ORDER BY pp.created_at ASC
        `;
        return await db.query(sql, [PAYMENT_STATUS.PENDING]);
    }
}

module.exports = PaymentProof;