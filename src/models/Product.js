const db = require('../database/pool');

/**
 * Modèle Produit - Gestion des produits gaziers
 */
class Product {
    /**
     * Crée un nouveau produit
     */
    static async create(productData) {
        const {
            category_id, sku, name, description, price,
            stock_quantity, gas_type, weight_kg, is_kit = false,
            is_featured = false, image_urls = null
        } = productData;

        const sql = `
            INSERT INTO products (
                category_id, sku, name, description, price,
                stock_quantity, gas_type, weight_kg, is_kit,
                is_featured, image_urls
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            category_id || null, sku, name, description || null, price,
            stock_quantity, gas_type || null, weight_kg || null, is_kit,
            is_featured, image_urls ? JSON.stringify(image_urls) : null
        ]);

        return {
            id: result.insertId,
            ...productData
        };
    }

    /**
     * Trouve un produit par ID
     */
    static async findById(id) {
        const sql = `
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? AND p.is_active = TRUE
        `;
        return await db.queryOne(sql, [id]);
    }

    /**
     * Trouve un produit par SKU
     */
    static async findBySku(sku) {
        const sql = `SELECT * FROM products WHERE sku = ?`;
        return await db.queryOne(sql, [sku]);
    }

    /**
     * Liste tous les produits actifs
     */
    static async findAll(filters = {}) {
        let sql = `
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = TRUE
        `;
        const params = [];

        if (filters.category_id) {
            sql += ` AND p.category_id = ?`;
            params.push(filters.category_id);
        }

        if (filters.is_featured) {
            sql += ` AND p.is_featured = TRUE`;
        }

        if (filters.is_kit !== undefined) {
            sql += ` AND p.is_kit = ?`;
            params.push(filters.is_kit);
        }

        if (filters.min_price) {
            sql += ` AND p.price >= ?`;
            params.push(filters.min_price);
        }

        if (filters.max_price) {
            sql += ` AND p.price <= ?`;
            params.push(filters.max_price);
        }

        if (filters.search) {
            sql += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)`;
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        sql += ` ORDER BY p.is_featured DESC, p.created_at DESC`;

        const limit = parseInt(filters.limit) || 20;
        const offset = parseInt(filters.offset) || 0;
        sql += ` LIMIT ${limit} OFFSET ${offset}`;

        return await db.query(sql, params);
    }

    /**
     * Met à jour un produit
     */
    static async update(id, data) {
        const allowedFields = [
            'category_id', 'name', 'description', 'price',
            'stock_quantity', 'gas_type', 'weight_kg', 'is_kit',
            'is_featured', 'image_urls', 'is_active'
        ];
        
        const updates = {};
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                if (field === 'image_urls' && data[field]) {
                    updates[field] = JSON.stringify(data[field]);
                } else {
                    updates[field] = data[field];
                }
            }
        });

        if (Object.keys(updates).length === 0) {
            return { affectedRows: 0 };
        }

        return await db.update('products', updates, 'id = ?', [id]);
    }

    /**
     * Met à jour le stock (décrémente)
     */
    static async decrementStock(id, quantity, connection = null) {
        // const {  } = data;

        const sql = `
            UPDATE products 
            SET stock_quantity = stock_quantity - ? 
            WHERE id = ? AND stock_quantity >= ?
        `;

        const executeQuery = connection 
            ? (sql, params) => connection.execute(sql, params)
            : (sql, params) => db.query(sql, params);

        const result = await executeQuery(sql, [quantity, id, quantity]);
        return result.affectedRows > 0;
    }

    /**
     * Supprime un produit (soft delete)
     */
    static async delete(id) {
        return await db.update('products', { is_active: false }, 'id = ?', [id]);
    }

    /**
     * Récupère les produits en rupture de stock
     */
    static async findLowStock(threshold = 5) {
        const sql = `
            SELECT * FROM products 
            WHERE stock_quantity <= ? AND is_active = TRUE
            ORDER BY stock_quantity ASC
        `;
        return await db.query(sql, [threshold]);
    }

    /**
     * Statistiques des produits
     */
    static async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_products,
                SUM(stock_quantity) as total_stock,
                SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock,
                SUM(CASE WHEN stock_quantity <= 5 THEN 1 ELSE 0 END) as low_stock,
                AVG(price) as average_price
            FROM products 
            WHERE is_active = TRUE
        `;
        return await db.queryOne(sql);
    }
}

module.exports = Product;