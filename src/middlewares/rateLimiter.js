const rateLimit = require('express-rate-limit');
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * Limiteur de requêtes général
 */
const globalLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: 'Trop de requêtes, veuillez réessayer plus tard.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        throw new AppError('Trop de requêtes, veuillez réessayer plus tard.', 429);
    }
});

/**
 * Limiteur pour l'authentification (plus restrictif)
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 tentatives
    message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
    skipSuccessfulRequests: true
});

/**
 * Limiteur pour la création de commande
 */
const orderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 5, // 5 commandes par heure
    message: 'Vous avez atteint la limite de commandes. Veuillez réessayer plus tard.'
});

module.exports = {
    globalLimiter,
    authLimiter,
    orderLimiter
};