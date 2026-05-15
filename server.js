<<<<<<< HEAD
// Chargement des variables d'environnement en premier
require('dotenv').config();

const app = require('./src/app');
const logger = require('./src/utils/logger');
const { PORT, NODE_ENV } = require('./src/config/env');
const db = require('./src/database/pool');

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    logger.error(err.name, err.message, err.stack);
    process.exit(1);
});

// Démarrage du serveur
const server = app.listen(PORT, () => {
    logger.info(`
    ╔════════════════════════════════════════════╗
    ║     🚀 RUGORI GAZ API Server Started       ║
    ╠════════════════════════════════════════════╣
    ║  Environment : ${NODE_ENV.padEnd(27)}║
    ║  Port        : ${String(PORT).padEnd(27)}║
    ║  URL         : http://localhost:${PORT.toString().padEnd(19)}║
    ║  Database    : MySQL Connected              ║
    ╚════════════════════════════════════════════╝
    `);
});

// Gestion des rejets de promesses non capturés
process.on('unhandledRejection', (err) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error(err.name, err.message);
    
    server.close(() => {
        process.exit(1);
    });
});

// Gestion de l'arrêt gracieux
process.on('SIGTERM', () => {
    logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
    
    server.close(() => {
        logger.info('💥 Process terminated!');
        db.pool.end();
    });
});

process.on('SIGINT', () => {
    logger.info('👋 SIGINT RECEIVED. Shutting down gracefully');
    
    server.close(() => {
        logger.info('💥 Process terminated!');
        db.pool.end();
    });
});

module.exports = server;
=======
require('dotenv').config({'path': './.env'});
const app = require('./app')
const pool = require('./config/db')

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log('Server is running on port ' + PORT)
});
>>>>>>> 6d9893ea03647f4bd80ea1e79fd0e5b77eed4b56
