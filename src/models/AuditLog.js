const db = require('../database/pool');

/**
 * Modèle Audit Log - Traçabilité
 */
class AuditLog {
    /**
     * Crée une entrée d'audit
     */
    static async create(data) {
        const {
            user_id, actor_id, action, entity_type,
            entity_id, old_values, new_values, ip_address, user_agent
        } = data;

        const sql = `
            INSERT INTO audit_logs (
                user_id, actor_id, action, entity_type, entity_id,
                old_values, new_values, ip_address, user_agent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            user_id || null,
            actor_id || null,
            action,
            entity_type || null,
            entity_id || null,
            old_values ? JSON.stringify(old_values) : null,
            new_values ? JSON.stringify(new_values) : null,
            ip_address || null,
            user_agent || null
        ]);

        return { id: result.insertId };
    }

    /**
     * Récupère les logs d'audit avec filtres
     */
    static async findAll(filters = {}) {
        let sql = `
            SELECT al.*,
                   u.full_name as user_name,
                   a.full_name as actor_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN users a ON al.actor_id = a.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.user_id) {
            sql += ` AND al.user_id = ?`;
            params.push(filters.user_id);
        }

        if (filters.actor_id) {
            sql += ` AND al.actor_id = ?`;
            params.push(filters.actor_id);
        }

        if (filters.action) {
            sql += ` AND al.action = ?`;
            params.push(filters.action);
        }

        if (filters.entity_type) {
            sql += ` AND al.entity_type = ?`;
            params.push(filters.entity_type);
        }

        if (filters.entity_id) {
            sql += ` AND al.entity_id = ?`;
            params.push(filters.entity_id);
        }

        if (filters.date_from) {
            sql += ` AND DATE(al.created_at) >= ?`;
            params.push(filters.date_from);
        }

        if (filters.date_to) {
            sql += ` AND DATE(al.created_at) <= ?`;
            params.push(filters.date_to);
        }

        sql += ` ORDER BY al.created_at DESC`;

        const limit = parseInt(filters.limit) || 50;
        const offset = parseInt(filters.offset) || 0;
        sql += ` LIMIT ${limit} OFFSET ${offset}`;

        return await db.query(sql, params);
    }

    /**
     * Récupère l'historique d'une entité spécifique
     */
    static async getEntityHistory(entityType, entityId) {
        const sql = `
            SELECT al.*,
                   a.full_name as actor_name
            FROM audit_logs al
            LEFT JOIN users a ON al.actor_id = a.id
            WHERE al.entity_type = ? AND al.entity_id = ?
            ORDER BY al.created_at ASC
        `;
        return await db.query(sql, [entityType, entityId]);
    }
}

module.exports = AuditLog;