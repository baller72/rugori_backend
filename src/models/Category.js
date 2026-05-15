const db = require('../database/pool');

/**
 * Modèle Catégorie - Gestion des catégories de produits
 */
class Category {
    static async create(data) {
        const { name, description, image_url } = data;
        const sql = `
            INSERT INTO categories (name, description, image_url)
            VALUES (?, ?, ?)
        `;
        const result = await db.query(sql, [name, description || null, image_url || null]);
        return { id: result.insertId, ...data };
    }

    static async findAll() {
        const sql = `
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
            WHERE c.is_active = TRUE
            GROUP BY c.id
            ORDER BY c.name
        `;
        return await db.query(sql);
    }

    static async findById(id) {
        const sql = `SELECT * FROM categories WHERE id = ? AND is_active = TRUE`;
        return await db.queryOne(sql, [id]);
    }

    static async update(id, data) {
        const allowedFields = ['name', 'description', 'image_url', 'is_active'];
        const updates = {};
        
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updates[field] = data[field];
            }
        });

        return await db.update('categories', updates, 'id = ?', [id]);
    }

    static async delete(id) {
        return await db.update('categories', { is_active: false }, 'id = ?', [id]);
    }
}

module.exports = Category;