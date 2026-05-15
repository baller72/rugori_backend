const db = require('../database/pool');

/**
 * Modèle Message - Messagerie interne
 */
class Message {
    /**
     * Crée un nouveau message
     */
    static async create(data) {
        const { order_id, sender_id, message, attachment_url } = data;

        const sql = `
            INSERT INTO messages (order_id, sender_id, message, attachment_url)
            VALUES (?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            order_id, sender_id, message, attachment_url || null
        ]);

        return { id: result.insertId, ...data };
    }

    /**
     * Récupère les messages d'une commande
     */
    static async findByOrder(orderId, limit = 100) {
        const sql = `
            SELECT m.*, 
                   u.full_name as sender_name,
                   u.role as sender_role
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.order_id = ?
            ORDER BY m.created_at ASC
            LIMIT ${parseInt(limit) || 100}
        `;
        return await db.query(sql, [orderId]);
    }

    /**
     * Marque les messages comme lus
     */
    static async markAsRead(orderId, userId) {
        const sql = `
            UPDATE messages 
            SET is_read = TRUE 
            WHERE order_id = ? AND sender_id != ?
        `;
        const result = await db.query(sql, [orderId, userId]);
        return result.affectedRows;
    }

    /**
     * Compte les messages non lus pour un utilisateur
     */
    static async countUnread(userId) {
        const sql = `
            SELECT COUNT(*) as unread_count
            FROM messages m
            JOIN orders o ON m.order_id = o.id
            WHERE (o.user_id = ? OR EXISTS (
                SELECT 1 FROM deliveries d 
                WHERE d.order_id = o.id AND d.delivery_person_id = ?
            ))
            AND m.sender_id != ?
            AND m.is_read = FALSE
        `;
        const result = await db.queryOne(sql, [userId, userId, userId]);
        return result.unread_count;
    }
}

module.exports = Message;