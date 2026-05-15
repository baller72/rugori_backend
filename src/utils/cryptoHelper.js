const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { BCRYPT_ROUNDS } = require('../config/env');

/**
 * Hash un mot de passe avec bcrypt
 * @param {String} password - Mot de passe en clair
 * @returns {Promise<String>} Hash du mot de passe
 */
const hashPassword = async (password) => {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
};

/**
 * Compare un mot de passe avec son hash
 * @param {String} password - Mot de passe en clair
 * @param {String} hash - Hash stocké
 * @returns {Promise<Boolean>} True si correspondance
 */
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

/**
 * Génère un code OTP aléatoire à 6 chiffres
 * @returns {String} Code OTP
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Génère un token aléatoire sécurisé
 * @param {Number} length - Longueur du token en bytes (défaut: 32)
 * @returns {String} Token hexadécimal
 */
const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Génère un token unique pour QR Code de livraison
 * @returns {String} Token unique
 */
const generateQRCodeToken = () => {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    return `RGZ-${timestamp}-${random}`.toUpperCase();
};

module.exports = {
    hashPassword,
    comparePassword,
    generateOTP,
    generateSecureToken,
    generateQRCodeToken
};