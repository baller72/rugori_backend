const db = require('../database/pool');

/**
 * Modèle Ligne de commande
 */
class OrderItem {
    /**
     * Crée une ligne de commande
     */
    static async create(itemData, connection = null) {
        const { order_id, product_id, quantity, unit_price, total_price } = itemData;

        const sql = `
            INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
            VALUES (?, ?, ?, ?, ?)
        `;

        const executeQuery = connection 
            ? (sql, params) => connection.execute(sql, params)
            : (sql, params) => db.query(sql, params);

        const result = await executeQuery(sql, [
            order_id, product_id, quantity, unit_price, total_price
        ]);

        return result.insertId || result[0].insertId;
    }

    /**
     * Crée plusieurs lignes en une fois
     */
    static async createMany(items, connection = null) {
        const createdItems = [];
        
        for (const item of items) {
            const id = await this.create(item, connection);
            createdItems.push({ id, ...item });
        }
        
        return createdItems;
    }

    /**
     * Récupère les lignes d'une commande
     */
    static async findByOrder(orderId) {
        const sql = `
            SELECT oi.*, p.name as product_name, p.sku, p.image_urls
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `;
        return await db.query(sql, [orderId]);
    }

    /**
     * Calcule le total d'une commande
     */
    static async calculateOrderTotal(orderId) {
        const sql = `
            SELECT SUM(total_price) as subtotal
            FROM order_items
            WHERE order_id = ?
        `;
        const result = await db.queryOne(sql, [orderId]);
        return result.subtotal || 0;
    }
}

module.exports = OrderItem;