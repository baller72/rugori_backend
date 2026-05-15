const User = require('../models/User');
const db = require('../database/pool');
const { comparePassword, generateOTP } = require('../utils/cryptoHelper');
const { generateTokenPair, verifyToken } = require('../utils/jwtHelper');
const EmailService = require('./EmailService');
const AuditLog = require('../models/AuditLog');
const { AUDIT_ACTIONS } = require('../config/constants');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Service d'authentification
 * Gère l'inscription, connexion, vérification OTP, refresh tokens
 */
class AuthService {
    /**
     * Inscription d'un nouveau client
     */
    static async register(userData, reqInfo = {}) {
        const { email, phone } = userData;

        // Vérification de l'unicité email/téléphone
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            throw new AppError('Cet email est déjà utilisé', 409);
        }

        const existingPhone = await User.findByPhone(phone);
        if (existingPhone) {
            throw new AppError('Ce numéro de téléphone est déjà utilisé', 409);
        }

        // Création de l'utilisateur
        const user = await User.create(userData);

        // Envoi de l'email de vérification OTP
        await EmailService.sendVerificationOTP(user.email, user.full_name, user.otp_code);

        // Audit
        await AuditLog.create({
            user_id: user.id,
            actor_id: user.id,
            action: AUDIT_ACTIONS.REGISTER,
            entity_type: 'User',
            entity_id: user.id,
            ip_address: reqInfo.ip,
            user_agent: reqInfo.userAgent
        });

        logger.info(`New user registered: ${email}`);

        return {
            id: user.id,
            uuid: user.uuid,
            email: user.email,
            full_name: user.full_name,
            message: 'Inscription réussie. Veuillez vérifier votre email.'
        };
    }

    /**
     * Connexion utilisateur
     */
    static async login(email, password, reqInfo = {}) {
        // Recherche de l'utilisateur
        const user = await User.findByEmail(email);

        if (!user) {
            throw new AppError('Email ou mot de passe incorrect', 401);
        }

        // Vérification du mot de passe
        const isPasswordValid = await comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            // Audit de tentative échouée
            await AuditLog.create({
                user_id: user.id,
                actor_id: user.id,
                action: AUDIT_ACTIONS.LOGIN_FAILED,
                entity_type: 'User',
                entity_id: user.id,
                ip_address: reqInfo.ip,
                user_agent: reqInfo.userAgent
            });

            throw new AppError('Email ou mot de passe incorrect', 401);
        }

        // Vérification de l'email
        if (!user.is_verified) {
            throw new AppError('Veuillez vérifier votre email avant de vous connecter', 403);
        }

        // Mise à jour du dernier login
        await User.updateLastLogin(user.id);

        // Génération des tokens
        const tokens = generateTokenPair(user);

        // Sauvegarde du refresh token
        await this.saveRefreshToken(user.id, tokens.refreshToken);

        // Audit de connexion réussie
        await AuditLog.create({
            user_id: user.id,
            actor_id: user.id,
            action: AUDIT_ACTIONS.LOGIN,
            entity_type: 'User',
            entity_id: user.id,
            ip_address: reqInfo.ip,
            user_agent: reqInfo.userAgent
        });

        logger.info(`User logged in: ${email}`);

        return {
            user: {
                id: user.id,
                uuid: user.uuid,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                is_verified: user.is_verified,
                vehicle_info: user.vehicle_info,
                is_available: user.is_available
            },
            tokens
        };
    }

    /**
     * Vérification OTP
     */
    static async verifyOTP(email, otp) {
        const verified = await User.verifyWithOTP(email, otp);
        
        if (!verified) {
            throw new AppError('Code OTP invalide ou expiré', 400);
        }

        const user = await User.findByEmail(email);
        
        logger.info(`User verified email: ${email}`);
        
        return {
            message: 'Email vérifié avec succès',
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name
            }
        };
    }

    /**
     * Renvoi d'OTP
     */
    static async resendOTP(email) {
        const user = await User.findByEmail(email);

        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        if (user.is_verified) {
            throw new AppError('Email déjà vérifié', 400);
        }

        // Génération nouveau OTP
        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const sql = `
            UPDATE users 
            SET otp_code = ?, otp_expires_at = ? 
            WHERE id = ?
        `;
        await db.query(sql, [otp, otpExpiresAt, user.id]);

        // Envoi email
        await EmailService.sendVerificationOTP(email, user.full_name, otp);

        return { message: 'Nouveau code OTP envoyé' };
    }

    /**
     * Rafraîchissement du token d'accès
     */
    static async refreshAccessToken(refreshToken) {
        // Vérification du token
        const decoded = verifyToken(refreshToken);
        if (!decoded) {
            throw new AppError('Token de rafraîchissement invalide', 401);
        }

        // Vérification en base
        const sql = `
            SELECT * FROM user_refresh_tokens 
            WHERE user_id = ? AND token = ? AND revoked = FALSE AND expires_at > NOW()
        `;
        const tokenRecord = await db.queryOne(sql, [decoded.userId, refreshToken]);
        
        if (!tokenRecord) {
            throw new AppError('Token de rafraîchissement révoqué ou expiré', 401);
        }

        // Récupération de l'utilisateur
        const user = await User.findById(decoded.userId);
        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        // Génération nouveaux tokens
        const tokens = generateTokenPair(user);

        // Révocation de l'ancien refresh token
        await this.revokeRefreshToken(refreshToken);

        // Sauvegarde du nouveau refresh token
        await this.saveRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }

    /**
     * Déconnexion
     */
    static async logout(refreshToken, userId, reqInfo = {}) {
        if (refreshToken) {
            await this.revokeRefreshToken(refreshToken);
        }

        if (userId) {
            await AuditLog.create({
                user_id: userId,
                actor_id: userId,
                action: AUDIT_ACTIONS.LOGOUT,
                entity_type: 'User',
                entity_id: userId,
                ip_address: reqInfo.ip,
                user_agent: reqInfo.userAgent
            });
        }

        return { message: 'Déconnexion réussie' };
    }

    /**
     * Sauvegarde d'un refresh token
     */
    static async saveRefreshToken(userId, token) {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

        const sql = `
            INSERT INTO user_refresh_tokens (user_id, token, expires_at)
            VALUES (?, ?, ?)
        `;
        await db.query(sql, [userId, token, expiresAt]);
    }

    /**
     * Révocation d'un refresh token
     */
    static async revokeRefreshToken(token) {
        const sql = `
            UPDATE user_refresh_tokens 
            SET revoked = TRUE 
            WHERE token = ?
        `;
        await db.query(sql, [token]);
    }

    /**
     * Révocation de tous les refresh tokens d'un utilisateur
     */
    static async revokeAllUserTokens(userId) {
        const sql = `
            UPDATE user_refresh_tokens 
            SET revoked = TRUE 
            WHERE user_id = ? AND revoked = FALSE
        `;
        await db.query(sql, [userId]);
    }

    /**
     * Changement de mot de passe
     */
    static async changePassword(userId, currentPassword, newPassword) {
        const user = await User.findById(userId);

        // Vérification mot de passe actuel
        const isPasswordValid = await comparePassword(currentPassword, user.password_hash);
        if (!isPasswordValid) {
            throw new AppError('Mot de passe actuel incorrect', 401);
        }

        // Mise à jour
        await User.updatePassword(userId, newPassword);
        
        // Révocation de tous les tokens
        await this.revokeAllUserTokens(userId);

        logger.info(`Password changed for user: ${userId}`);

        return { message: 'Mot de passe modifié avec succès' };
    }

    /**
     * Demande de réinitialisation de mot de passe
     */
    static async forgotPassword(email) {
        const user = await User.findByEmail(email);
        
        if (!user) {
            // Pour des raisons de sécurité, ne pas révéler si l'email existe
            return { message: 'Si votre email est enregistré, vous recevrez un lien de réinitialisation' };
        }

        // Génération token de réinitialisation
        const resetToken = generateOTP();
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

        const sql = `
            UPDATE users 
            SET otp_code = ?, otp_expires_at = ? 
            WHERE id = ?
        `;
        await db.query(sql, [resetToken, resetExpires, user.id]);

        // Envoi email
        await EmailService.sendPasswordResetOTP(email, user.full_name, resetToken);

        return { message: 'Si votre email est enregistré, vous recevrez un lien de réinitialisation' };
    }

    /**
     * Réinitialisation de mot de passe
     */
    static async resetPassword(email, otp, newPassword) {
        const user = await User.findByEmail(email);

        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        // Vérification OTP
        const sql = `
            SELECT id FROM users 
            WHERE email = ? AND otp_code = ? AND otp_expires_at > NOW()
        `;
        const validUser = await db.queryOne(sql, [email, otp]);
        
        if (!validUser) {
            throw new AppError('Code de réinitialisation invalide ou expiré', 400);
        }

        // Mise à jour mot de passe
        await User.updatePassword(user.id, newPassword);

        // Nettoyage OTP
        const clearOTPSql = `
            UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?
        `;
        await db.query(clearOTPSql, [user.id]);

        // Révocation des tokens
        await this.revokeAllUserTokens(user.id);

        return { message: 'Mot de passe réinitialisé avec succès' };
    }
}

module.exports = AuthService;