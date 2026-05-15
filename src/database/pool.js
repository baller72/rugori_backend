const { pool: mysqlPool, testConnection } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Classe wrapper pour le pool MySQL avec méthodes utilitaires
 */
class DatabasePool {
    constructor() {
        this.pool = mysqlPool;
    }

    /**
     * Exécute une requête SQL avec paramètres
     */
    async query(sql, params = []) {
        const start = Date.now();
        try {
            const [rows] = await this.pool.execute(sql, params);
            const duration = Date.now() - start;
            logger.debug('Query executed', { sql: sql.substring(0, 100), duration, rowCount: rows.length });
            return rows;
        } catch (error) {
            logger.error('Query failed', { sql: sql.substring(0, 100), error: error.message });
            throw error;
        }
    }

    /**
     * Exécute une requête et retourne le premier résultat
     */
    async queryOne(sql, params = []) {
        const rows = await this.query(sql, params);
        return rows[0] || null;
    }

    /**
     * Exécute une transaction
     */
    async transaction(callback) {
        const connection = await this.pool.getConnection();
        await connection.beginTransaction();

        try {
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Insère des données et retourne l'ID
     */
    async insert(table, data) {
        const fields = Object.keys(data);
        const values = Object.values(data);
        const placeholders = fields.map(() => '?').join(', ');
        
        const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
        const result = await this.query(sql, values);
        
        return {
            insertId: result.insertId,
            affectedRows: result.affectedRows
        };
    }

    /**
     * Met à jour des données
     */
    async update(table, data, where, whereParams = []) {
        const setClause = Object.keys(data).map(field => `${field} = ?`).join(', ');
        const values = [...Object.values(data), ...whereParams];
        
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
        const result = await this.query(sql, values);
        
        return {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };
    }
}

// Singleton
const db = new DatabasePool();

// Test de connexion au démarrage
testConnection().catch(error => {
    logger.error('Failed to connect to database. Exiting...');
    process.exit(1);
});

module.exports = db;