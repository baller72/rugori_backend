const db = require('../database/pool');
const { ORDER_STATUS, DELIVERY_VALIDATION_METHODS } = require('../config/constants');
const { generateQRCodeToken } = require('../utils/cryptoHelper');

/**
 * Modèle Livraison
 */
class Delivery {
    /**
     * Crée une livraison avec QR Code
     */
    static async create(orderId, connection = null) {
        const qr_code_token = generateQRCodeToken();

        const sql = `
            INSERT INTO deliveries (order_id, qr_code_token)
            VALUES (?, ?)
        `;

        const executeQuery = connection 
            ? (sql, params) => connection.execute(sql, params)
            : (sql, params) => db.query(sql, params);

        const result = await executeQuery(sql, [orderId, qr_code_token]);

        return {
            id: result.insertId,
            order_id: orderId,
            qr_code_token
        };
    }

    /**
     * Trouve une livraison par token QR
     */
    static async findByQRToken(token) {
        const sql = `
            SELECT d.*, 
                   o.order_number, o.delivery_address, o.status as order_status,
                   o.recipient_name, o.recipient_phone,
                   u.full_name as delivery_person_name
            FROM deliveries d
            JOIN orders o ON d.order_id = o.id
            LEFT JOIN users u ON d.delivery_person_id = u.id
            WHERE d.qr_code_token = ?
        `;
        return await db.queryOne(sql, [token]);
    }

    /**
     * Trouve une livraison par ID de commande
     */
    static async findByOrder(orderId) {
        const sql = `
            SELECT d.*, u.full_name as delivery_person_name, u.phone as delivery_person_phone
            FROM deliveries d
            LEFT JOIN users u ON d.delivery_person_id = u.id
            WHERE d.order_id = ?
        `;
        return await db.queryOne(sql, [orderId]);
    }

    /**
     * Assigne un livreur à une commande
     */
    static async assignDeliveryPerson(orderId, deliveryPersonId) {
        const connection = await db.pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Mise à jour de la livraison
            const updateDeliverySql = `
                UPDATE deliveries 
                SET delivery_person_id = ?, 
                    assigned_at = NOW(),
                    updated_at = NOW()
                WHERE order_id = ?
            `;
            await connection.execute(updateDeliverySql, [deliveryPersonId, orderId]);

            // Mise à jour du statut de la commande
            const updateOrderSql = `
                UPDATE orders 
                SET status = ?, updated_at = NOW()
                WHERE id = ?
            `;
            await connection.execute(updateOrderSql, [ORDER_STATUS.OUT_FOR_DELIVERY, orderId]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Valide une livraison par scan QR
     */
    static async validateDelivery(orderId, validationData) {
        const {
            validation_method = DELIVERY_VALIDATION_METHODS.QR_SCAN,
            delivery_notes = null
        } = validationData;

        const connection = await db.pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Mise à jour de la livraison
            const updateDeliverySql = `
                UPDATE deliveries 
                SET delivered_at = NOW(),
                    validation_method = ?,
                    delivery_notes = ?,
                    updated_at = NOW()
                WHERE order_id = ?
            `;
            await connection.execute(updateDeliverySql, [
                validation_method, delivery_notes, orderId
            ]);

            // Mise à jour du statut de la commande
            const updateOrderSql = `
                UPDATE orders 
                SET status = ?, updated_at = NOW()
                WHERE id = ?
            `;
            await connection.execute(updateOrderSql, [ORDER_STATUS.DELIVERED, orderId]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Récupère l'historique des livraisons d'un livreur
     */
    static async getHistoryByPerson(deliveryPersonId, limit = 50) {
        const sql = `
            SELECT d.*, 
                   o.order_number, o.delivery_address,
                   o.total_amount, o.created_at as order_created_at,
                   u.full_name as customer_name
            FROM deliveries d
            JOIN orders o ON d.order_id = o.id
            JOIN users u ON o.user_id = u.id
            WHERE d.delivery_person_id = ?
            ORDER BY d.delivered_at DESC
            LIMIT ${parseInt(limit) || 50}
        `;
        return await db.query(sql, [deliveryPersonId]);
    }
}

module.exports = Delivery;