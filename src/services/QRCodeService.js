const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const db = require('../config/database')
const logger = require('../utils/logger');
const { UPLOAD_PATH, FRONTEND_URL } = require('../config/env');

/**
 * Service de génération et gestion des QR Codes
 */
class QRCodeService {
    constructor() {
        this.qrCodeDir = path.join(UPLOAD_PATH, 'qrcodes');
        this.initDirectory();
    }

    /**
     * Initialise le répertoire des QR Codes
     */
    async initDirectory() {
        try {
            await fs.mkdir(this.qrCodeDir, { recursive: true });
        } catch (error) {
            logger.error('Failed to create QR code directory:', error);
        }
    }

    /**
     * Génère un QR Code et le sauvegarde
     */
    async generateAndSaveQRCode(token, orderId) {
        try {
            // Contenu du QR Code (URL de validation)
            const qrContent = `${FRONTEND_URL}/delivery/validate/${token}`;
            
            // Options de génération
            const options = {
                errorCorrectionLevel: 'H',
                type: 'png',
                quality: 0.95,
                margin: 2,
                width: 300,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            };

            // Génération du QR Code
            const qrBuffer = await QRCode.toBuffer(qrContent, options);
            
            // Sauvegarde du fichier
            const filename = `qr_${orderId}_${Date.now()}.png`;
            const filepath = path.join(this.qrCodeDir, filename);
            
            await fs.writeFile(filepath, qrBuffer);

            // Mise à jour en base de l'URL
            const qrCodeUrl = `/uploads/qrcodes/${filename}`;
            
            const sql = `
                UPDATE deliveries 
                SET qr_code_image_url = ? 
                WHERE qr_code_token = ?
            `;
            await db.query(sql, [qrCodeUrl, token]);

            logger.info(`QR Code generated for order ${orderId}`);

            return qrCodeUrl;
        } catch (error) {
            logger.error('Failed to generate QR Code:', error);
            throw error;
        }
    }

    /**
     * Récupère l'URL du QR Code
     */
    async getQRCodeUrl(token, orderId) {
        const sql = `
            SELECT qr_code_image_url FROM deliveries 
            WHERE qr_code_token = ?
        `;
        const result = await db.query(sql, [token]);

        if (result?.qr_code_image_url) {
            return result.qr_code_image_url;
        }

        // Si pas d'URL, générer le QR Code
        return await this.generateAndSaveQRCode(token, orderId);
    }

    /**
     * Vérifie la validité d'un token QR
     */
    async validateQRToken(token) {
        const delivery = await Delivery.findByQRToken(token);
        
        if (!delivery) {
            return { valid: false, reason: 'Token invalide' };
        }

        if (delivery.delivered_at) {
            return { valid: false, reason: 'Commande déjà livrée' };
        }

        if (delivery.order_status !== 'out_for_delivery') {
            return { valid: false, reason: 'Commande non en cours de livraison' };
        }

        return {
            valid: true,
            delivery: {
                order_id: delivery.order_id,
                order_number: delivery.order_number,
                delivery_address: delivery.delivery_address,
                delivery_person_name: delivery.delivery_person_name
            }
        };
    }
}

module.exports = new QRCodeService();