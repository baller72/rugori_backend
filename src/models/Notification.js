const db = require('../database/pool');
const { NOTIFICATION_TYPES } = require('../config/constants');

/**
 * Modèle Notification - Notifications In-App
 */
class Notification {
    /**
     * Crée une notification
     */
    static async create(data) {
        const { user_id, title, message, type, link } = data;

        const sql = `
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES (?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            user_id, title, message, type || null, link || null
        ]);

        return { id: result.insertId, ...data };
    }

    /**
     * Crée plusieurs notifications en masse
     */
    static async createMany(notifications) {
        if (notifications.length === 0) return [];
        
        const values = notifications.map(n => [
            n.user_id, n.title, n.message, n.type || null, n.link || null
        ]);
        
        const sql = `
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES ?
        `;

        const result = await db.query(sql, [values]);
        return result.affectedRows;
    }

    /**
     * Récupère les notifications d'un utilisateur
     */
    static async findByUser(userId, limit = 50, includeRead = false) {
        let sql = `
            SELECT * FROM notifications 
            WHERE user_id = ?
        `;
        
        if (!includeRead) {
            sql += ` AND is_read = FALSE`;
        }
        
        sql += ` ORDER BY created_at DESC LIMIT ${parseInt(limit) || 50}`;
        
        return await db.query(sql, [userId]);
    }

    /**
     * Marque une notification comme lue
     */
    static async markAsRead(id, userId) {
        const sql = `
            UPDATE notifications 
            SET is_read = TRUE 
            WHERE id = ? AND user_id = ?
        `;
        return await db.query(sql, [id, userId]);
    }

    /**
     * Marque toutes les notifications comme lues
     */
    static async markAllAsRead(userId) {
        const sql = `
            UPDATE notifications 
            SET is_read = TRUE 
            WHERE user_id = ? AND is_read = FALSE
        `;
        return await db.query(sql, [userId]);
    }

    /**
     * Compte les notifications non lues
     */
    static async countUnread(userId) {
        const sql = `
            SELECT COUNT(*) as unread_count
            FROM notifications
            WHERE user_id = ? AND is_read = FALSE
        `;
        const result = await db.queryOne(sql, [userId]);
        return result.unread_count;
    }

    /**
     * Supprime les vieilles notifications
     */
    static async deleteOld(daysOld = 30) {
        const sql = `
            DELETE FROM notifications 
            WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
              AND is_read = TRUE
        `;
        return await db.query(sql, [daysOld]);
    }
}

module.exports = Notification;