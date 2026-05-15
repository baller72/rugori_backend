const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES } = require('../config/env');
const logger = require('./logger');

/**
 * Génère un token d'accès JWT
 * @param {Object} payload - Données à encoder dans le token
 * @returns {String} Token JWT
 */
const generateAccessToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_ACCESS_EXPIRES
    });
};

/**
 * Génère un token de rafraîchissement JWT
 * @param {Object} payload - Données à encoder dans le token
 * @returns {String} Token JWT
 */
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES
    });
};

/**
 * Vérifie et décode un token JWT
 * @param {String} token - Token à vérifier
 * @returns {Object|null} Payload décodé ou null si invalide
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        logger.debug('Token verification failed:', error.message);
        return null;
    }
};

/**
 * Génère une paire de tokens (access + refresh)
 * @param {Object} user - Objet utilisateur
 * @returns {Object} Tokens générés
 */
const generateTokenPair = (user) => {
    const payload = {
        userId: user.id,
        uuid: user.uuid,
        email: user.email,
        role: user.role
    };

    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload)
    };
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
    generateTokenPair
};