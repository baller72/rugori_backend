const db = require('../database/pool');
const { ORDER_STATUS } = require('../config/constants');

/**
 * Modèle Commande - Gestion complète des commandes
 */
class Order {
    /**
     * Crée une nouvelle commande
     */
    static async create(orderData, connection = null) {
        const {
            order_number, user_id, delivery_address, delivery_notes,
            recipient_name, recipient_phone, subtotal, delivery_fee, total_amount
        } = orderData;

        const sql = `
            INSERT INTO orders (
                order_number, user_id, delivery_address, delivery_notes,
                recipient_name, recipient_phone, subtotal, delivery_fee,
                total_amount, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const executeQuery = connection 
            ? (sql, params) => connection.execute(sql, params)
            : (sql, params) => db.query(sql, params);

        const result = await executeQuery(sql, [
            order_number, user_id, delivery_address, delivery_notes || null,
            recipient_name, recipient_phone, subtotal, delivery_fee || 0,
            total_amount, ORDER_STATUS.PENDING_PAYMENT
        ]);

        return {
            id: result.insertId || result[0].insertId,
            order_number
        };
    }

    /**
     * Trouve une commande par ID avec détails
     */
    static async findById(id) {
        const sql = `
            SELECT o.*,
                   u.full_name as customer_name,
                   u.email as customer_email,
                   u.phone as customer_phone,
                   d.id as delivery_id,
                   d.qr_code_token,
                   d.delivery_person_id,
                   d.delivered_at,
                   lp.full_name as delivery_person_name,
                   pp.id as payment_proof_id,
                   pp.status as payment_status
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN deliveries d ON o.id = d.order_id
            LEFT JOIN users lp ON d.delivery_person_id = lp.id
            LEFT JOIN payment_proofs pp ON o.id = pp.order_id
            WHERE o.id = ?
        `;
        return await db.queryOne(sql, [id]);
    }

    /**
     * Trouve une commande par numéro
     */
    static async findByOrderNumber(orderNumber) {
        const sql = `SELECT * FROM orders WHERE order_number = ?`;
        return await db.queryOne(sql, [orderNumber]);
    }

    /**
     * Récupère les commandes d'un utilisateur
     */
    static async findByUser(userId, filters = {}) {
        let sql = `
            SELECT o.*, 
                   COUNT(oi.id) as item_count,
                   d.qr_code_token,
                   d.delivery_person_id
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN deliveries d ON o.id = d.order_id
            WHERE o.user_id = ?
        `;
        const params = [userId];

        if (filters.status) {
            sql += ` AND o.status = ?`;
            params.push(filters.status);
        }

        sql += ` GROUP BY o.id ORDER BY o.created_at DESC`;

        const limit = parseInt(filters.limit) || 20;
        const offset = parseInt(filters.offset) || 0;
        sql += ` LIMIT ${limit} OFFSET ${offset}`;

        return await db.query(sql, params);
    }

    /**
     * Récupère toutes les commandes (admin/livreur)
     */
    static async findAll(filters = {}) {
        let sql = `
            SELECT o.*,
                   u.full_name as customer_name,
                   u.phone as customer_phone,
                   COUNT(oi.id) as item_count,
                   d.qr_code_token,
                   d.delivery_person_id,
                   lp.full_name as delivery_person_name
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN deliveries d ON o.id = d.order_id
            LEFT JOIN users lp ON d.delivery_person_id = lp.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.status) {
            sql += ` AND o.status = ?`;
            params.push(filters.status);
        }

        if (filters.user_id) {
            sql += ` AND o.user_id = ?`;
            params.push(filters.user_id);
        }

        if (filters.delivery_person_id) {
            sql += ` AND d.delivery_person_id = ?`;
            params.push(filters.delivery_person_id);
        }

        if (filters.date_from) {
            sql += ` AND DATE(o.created_at) >= ?`;
            params.push(filters.date_from);
        }

        if (filters.date_to) {
            sql += ` AND DATE(o.created_at) <= ?`;
            params.push(filters.date_to);
        }

        sql += ` GROUP BY o.id ORDER BY o.created_at DESC`;

        const limit = parseInt(filters.limit) || 20;
        const offset = parseInt(filters.offset) || 0;
        sql += ` LIMIT ${limit} OFFSET ${offset}`;

        return await db.query(sql, params);
    }

    /**
     * Met à jour le statut d'une commande
     */
    static async updateStatus(id, status, userId = null) {
        const updates = { status };
        
        if (status === ORDER_STATUS.PAYMENT_VERIFIED && userId) {
            updates.payment_validated_by = userId;
            updates.payment_validated_at = new Date();
        }

        return await db.update('orders', updates, 'id = ?', [id]);
    }

    /**
     * Récupère les commandes prêtes pour livraison
     */
    static async findReadyForDelivery() {
        const sql = `
            SELECT o.*,
                   u.full_name as customer_name,
                   u.phone as customer_phone,
                   o.delivery_address
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.status = ?
              AND NOT EXISTS (
                  SELECT 1 FROM deliveries d 
                  WHERE d.order_id = o.id AND d.delivery_person_id IS NOT NULL
              )
            ORDER BY o.created_at ASC
        `;
        return await db.query(sql, [ORDER_STATUS.READY_FOR_DELIVERY]);
    }

    /**
     * Récupère les commandes en cours de livraison pour un livreur
     */
    static async findActiveDeliveries(deliveryPersonId) {
        const sql = `
            SELECT o.*, d.qr_code_token, d.assigned_at,
                   u.full_name as customer_name,
                   u.phone as customer_phone
            FROM orders o
            JOIN deliveries d ON o.id = d.order_id
            JOIN users u ON o.user_id = u.id
            WHERE d.delivery_person_id = ?
              AND o.status = ?
              AND d.delivered_at IS NULL
            ORDER BY d.assigned_at DESC
        `;
        return await db.query(sql, [deliveryPersonId, ORDER_STATUS.OUT_FOR_DELIVERY]);
    }

    /**
     * Statistiques des commandes
     */
    static async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_orders,
                SUM(total_amount) as total_revenue,
                SUM(CASE WHEN status = 'pending_payment' THEN 1 ELSE 0 END) as pending_payment,
                SUM(CASE WHEN status = 'payment_verified' THEN 1 ELSE 0 END) as payment_verified,
                SUM(CASE WHEN status = 'ready_for_delivery' THEN 1 ELSE 0 END) as ready_for_delivery,
                SUM(CASE WHEN status = 'out_for_delivery' THEN 1 ELSE 0 END) as out_for_delivery,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as orders_today
            FROM orders
        `;
        return await db.queryOne(sql);
    }

    /**
     * Statistiques de revenus par période
     */
    static async getRevenueStats(period = 'month') {
        let dateFormat;
        if (period === 'day') dateFormat = '%Y-%m-%d';
        else if (period === 'month') dateFormat = '%Y-%m';
        else dateFormat = '%Y';

        const sql = `
            SELECT 
                DATE_FORMAT(created_at, ?) as period,
                COUNT(*) as order_count,
                SUM(total_amount) as revenue
            FROM orders
            WHERE status = 'delivered'
            GROUP BY period
            ORDER BY period DESC
            LIMIT 12
        `;
        return await db.query(sql, [dateFormat]);
    }
}

module.exports = Order;