const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const { NODE_ENV } = require('../config/env');

/**
 * Gestionnaire d'erreurs global
 */
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log de l'erreur
    logger.error({
        message: err.message,
        stack: err.stack,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id
    });

    if (NODE_ENV === 'development') {
        // Mode développement : détails complets
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            error: err,
            stack: err.stack,
            errors: err.errors
        });
    }

    // Mode production : réponses simplifiées
    if (err.isOperational) {
        // Erreurs opérationnelles (attendues)
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            errors: err.errors
        });
    }

    // Erreurs de programmation ou inconnues
    console.error('ERROR 💥', err);
    
    return res.status(500).json({
        status: 'error',
        message: 'Une erreur interne est survenue. Veuillez réessayer plus tard.'
    });
};

/**
 * Middleware pour les routes non trouvées
 */
const notFound = (req, res, next) => {
    const error = new AppError(`Route non trouvée: ${req.originalUrl}`, 404);
    next(error);
};

module.exports = {
    errorHandler,
    notFound
};