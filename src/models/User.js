const db = require('../database/pool');
const { hashPassword, generateOTP } = require('../utils/cryptoHelper');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Modèle Utilisateur - Gestion des clients, livreurs et administrateurs
 * Implémente le pattern Active Record simplifié
 */
class User {
    /**
     * Crée un nouvel utilisateur
     * @param {Object} userData - Données de l'utilisateur
     * @returns {Promise<Object>} Utilisateur créé
     */
    static async create(userData) {
        const {
            full_name, email, phone, password,
            role = 'client', vehicle_info = null
        } = userData;

        // Hash du mot de passe
        const password_hash = await hashPassword(password);
        
        // Génération UUID pour sécurité
        const uuid = uuidv4();
        
        // Génération OTP pour vérification email
        const otp_code = generateOTP();
        const otp_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        const sql = `
            INSERT INTO users (
                uuid, full_name, email, phone, password_hash,
                role, vehicle_info, otp_code, otp_expires_at, is_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            uuid, full_name, email.toLowerCase(), phone, password_hash,
            role, vehicle_info, otp_code, otp_expires_at, false
        ]);

        return {
            id: result.insertId,
            uuid,
            full_name,
            email: email.toLowerCase(),
            phone,
            role,
            otp_code // Retourné pour envoi email
        };
    }

    /**
     * Trouve un utilisateur par son email
     */
    static async findByEmail(email) {
        const sql = `
            SELECT id, uuid, full_name, email, phone, password_hash,
                   role, is_verified, vehicle_info, is_available,
                   last_login_at, created_at, updated_at
            FROM users 
            WHERE email = ?
        `;
        return await db.queryOne(sql, [email.toLowerCase()]);
    }

    /**
     * Trouve un utilisateur par son ID
     */
    static async findById(id) {
        const sql = `
            SELECT id, uuid, full_name, email, phone,
                   role, is_verified, vehicle_info, is_available,
                   last_login_at, created_at, updated_at
            FROM users 
            WHERE id = ?
        `;
        return await db.queryOne(sql, [id]);
    }

    /**
     * Trouve un utilisateur par son UUID (public)
     */
    static async findByUuid(uuid) {
        const sql = `
            SELECT id, uuid, full_name, email, phone,
                   role, is_verified, vehicle_info, is_available,
                   last_login_at, created_at, updated_at
            FROM users 
            WHERE uuid = ?
        `;
        return await db.queryOne(sql, [uuid]);
    }

    /**
     * Trouve un utilisateur par téléphone
     */
    static async findByPhone(phone) {
        const sql = `
            SELECT id, uuid, full_name, email, phone,
                   role, is_verified, vehicle_info, is_available
            FROM users 
            WHERE phone = ?
        `;
        return await db.queryOne(sql, [phone]);
    }

    /**
     * Vérifie un utilisateur avec OTP
     */
    static async verifyWithOTP(email, otp) {
        const sql = `
            UPDATE users 
            SET is_verified = TRUE, 
                otp_code = NULL, 
                otp_expires_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE email = ? 
              AND otp_code = ? 
              AND otp_expires_at > NOW()
              AND is_verified = FALSE
        `;
        
        const result = await db.query(sql, [email.toLowerCase(), otp]);
        return result.affectedRows > 0;
    }

    /**
     * Met à jour le dernier login
     */
    static async updateLastLogin(id) {
        const sql = `UPDATE users SET last_login_at = NOW() WHERE id = ?`;
        await db.query(sql, [id]);
    }

    /**
     * Met à jour le profil utilisateur
     */
    static async updateProfile(id, data) {
        const allowedFields = ['full_name', 'phone'];
        const updates = {};
        
        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updates[field] = data[field];
            }
        });

        if (Object.keys(updates).length === 0) {
            return { affectedRows: 0 };
        }

        const result = await db.update('users', updates, 'id = ?', [id]);
        return result;
    }

    /**
     * Met à jour le mot de passe
     */
    static async updatePassword(id, newPassword) {
        const password_hash = await hashPassword(newPassword);
        return await db.update('users', { password_hash }, 'id = ?', [id]);
    }

    /**
     * Liste tous les livreurs disponibles
     */
    static async findAvailableLivreurs() {
        const sql = `
            SELECT id, uuid, full_name, email, phone, vehicle_info, is_available, created_at
            FROM users 
            WHERE role = 'livreur' 
              AND is_available = TRUE 
              AND is_verified = TRUE
        `;
        return await db.query(sql);
    }

    /**
     * Bascule la disponibilité d'un livreur
     */
    static async toggleAvailability(id, isAvailable) {
        return await db.update('users', { is_available: isAvailable }, 'id = ?', [id]);
    }

    /**
     * Récupère tous les utilisateurs (admin)
     */
    static async findAll(filters = {}) {
        let sql = `
            SELECT id, uuid, full_name, email, phone, role,
                   is_verified, vehicle_info, is_available,
                   last_login_at, created_at
            FROM users 
            WHERE 1=1
        `;
        const params = [];

        if (filters.role) {
            sql += ` AND role = ?`;
            params.push(filters.role);
        }

        if (filters.is_verified !== undefined) {
            sql += ` AND is_verified = ?`;
            params.push(filters.is_verified === 'true' || filters.is_verified === true ? true : false);
        }

        sql += ` ORDER BY created_at DESC`;

        const limit = parseInt(filters.limit) || 20;
        const offset = parseInt(filters.offset) || 0;
        sql += ` LIMIT ${limit} OFFSET ${offset}`;

        return await db.query(sql, params);
    }

    /**
     * Compte le nombre total d'utilisateurs
     */
    static async count(filters = {}) {
        let sql = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
        const params = [];

        if (filters.role) {
            sql += ` AND role = ?`;
            params.push(filters.role);
        }

        const result = await db.queryOne(sql, params);
        return result.total;
    }

    /**
     * Supprime un utilisateur (soft delete non implémenté ici)
     */
    static async delete(id) {
        const sql = `DELETE FROM users WHERE id = ?`;
        const result = await db.query(sql, [id]);
        return result.affectedRows > 0;
    }

    /**
     * Récupère les statistiques utilisateurs
     */
    static async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END) as total_clients,
                SUM(CASE WHEN role = 'livreur' THEN 1 ELSE 0 END) as total_livreurs,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as total_admins,
                SUM(CASE WHEN is_verified = TRUE THEN 1 ELSE 0 END) as verified_users,
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as new_today
            FROM users
        `;
        return await db.queryOne(sql);
    }
}

module.exports = User;