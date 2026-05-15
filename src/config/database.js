const mysql = require('mysql2/promise');
const logger = require('../utils/logger');
const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_CONNECTION_LIMIT } = require('./env');

// Configuration du pool de connexions MySQL
const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: parseInt(DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // Timezone pour Burundi (UTC+2)
    timezone: '+02:00',
    // Formatage des dates
    dateStrings: true,
    // Conversion automatique des colonnes JSON
    typeCast: function (field, next) {
        if (field.type === 'JSON') {
            const value = field.string();
            return value ? JSON.parse(value) : null;
        }
        return next();
    }
});

// Test de connexion au démarrage
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        logger.info(`✅ MySQL Database connected successfully to ${DB_NAME}`);
        connection.release();
        return true;
    } catch (error) {
        logger.error('❌ MySQL connection failed:', error.message);
        throw error;
    }
};

// Wrapper pour exécution de requêtes avec transaction support
const executeQuery = async (sql, params = [], options = {}) => {
    const { useTransaction = false, connection = null } = options;
    
    const execute = async (conn) => {
        try {
            const [rows] = await conn.execute(sql, params);
            return rows;
        } catch (error) {
            logger.error('Query execution error:', { sql, params, error: error.message });
            throw error;
        }
    };

    if (useTransaction && connection) {
        return await execute(connection);
    } else {
        return await execute(pool);
    }
};

// Helper pour les transactions
const withTransaction = async (callback) => {
    const connection = await pool.getConnection();
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
};

module.exports = {
    pool,
    testConnection,
    executeQuery,
    withTransaction
};