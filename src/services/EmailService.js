const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const {
    SMTP_HOST, SMTP_PORT, SMTP_SECURE,
    SMTP_USER, SMTP_PASSWORD, EMAIL_FROM
} = require('../config/env');
const { verificationEmailTemplate, passwordResetTemplate } = require('../utils/emailTemplates');

/**
 * Service d'envoi d'emails
 */
class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_SECURE,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASSWORD
            }
        });
    }

    /**
     * Envoi d'email générique
     */
    async sendEmail(to, subject, html) {
        try {
            const info = await this.transporter.sendMail({
                from: EMAIL_FROM,
                to,
                subject,
                html
            });
            
            logger.info(`Email sent to ${to}: ${info.messageId}`);
            return info;
        } catch (error) {
            logger.error(`Failed to send email to ${to}:`, error);
            throw error;
        }
    }

    /**
     * Envoi OTP de vérification
     */
    async sendVerificationOTP(email, name, otp) {
        const subject = 'Vérification de votre compte RUGORI GAZ';
        const html = verificationEmailTemplate(name, otp);
        
        return await this.sendEmail(email, subject, html);
    }

    /**
     * Envoi OTP de réinitialisation mot de passe
     */
    async sendPasswordResetOTP(email, name, otp) {
        const subject = 'Réinitialisation de votre mot de passe - RUGORI GAZ';
        const html = passwordResetTemplate(name, otp);
        
        return await this.sendEmail(email, subject, html);
    }

    /**
     * Notification de confirmation de commande
     */
    async sendOrderConfirmation(email, name, orderNumber, orderDetails) {
        const subject = `Confirmation de commande #${orderNumber} - RUGORI GAZ`;
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #FF6B00; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                    .order-details { margin: 20px 0; }
                    .total { font-size: 18px; font-weight: bold; color: #FF6B00; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>RUGORI GAZ</h1>
                        <p>Confirmation de commande</p>
                    </div>
                    <div class="content">
                        <p>Bonjour ${name},</p>
                        <p>Nous avons bien reçu votre commande <strong>#${orderNumber}</strong>.</p>
                        
                        <div class="order-details">
                            <h3>Détails de la commande :</h3>
                            ${orderDetails}
                        </div>
                        
                        <p class="total">Total : ${orderDetails.total} BIF</p>
                        
                        <p>
                            <strong>Adresse de livraison :</strong><br>
                            ${orderDetails.deliveryAddress}
                        </p>
                        
                        <p>
                            <strong>Instructions de paiement :</strong><br>
                            Veuillez effectuer le paiement via Mobile Money ou virement bancaire, puis télécharger la preuve de paiement sur votre compte.
                        </p>
                        
                        <p>
                            <a href="${process.env.FRONTEND_URL}/orders/${orderNumber}" 
                               style="display: inline-block; padding: 10px 20px; background: #FF6B00; color: white; text-decoration: none; border-radius: 5px;">
                                Suivre ma commande
                            </a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>RUGORI GAZ - Votre partenaire gazier de confiance</p>
                        <p>Contact : +257 XX XX XX XX | contact@rugorigaz.bi</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        return await this.sendEmail(email, subject, html);
    }

    /**
     * Notification de changement de statut
     */
    async sendOrderStatusUpdate(email, name, orderNumber, status) {
        const statusMessages = {
            'payment_verified': 'Votre paiement a été validé. Votre commande est en cours de préparation.',
            'out_for_delivery': 'Votre commande est en cours de livraison !',
            'delivered': 'Votre commande a été livrée avec succès. Merci de votre confiance !',
            'cancelled': 'Votre commande a été annulée.'
        };

        const subject = `Mise à jour de votre commande #${orderNumber} - RUGORI GAZ`;
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #FF6B00; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; text-align: center; }
                    .status { font-size: 24px; color: #FF6B00; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>RUGORI GAZ</h1>
                        <p>Mise à jour de commande</p>
                    </div>
                    <div class="content">
                        <p>Bonjour ${name},</p>
                        <div class="status">${statusMessages[status] || 'Statut mis à jour'}</div>
                        <p>Commande #${orderNumber}</p>
                        <p>
                            <a href="${process.env.FRONTEND_URL}/orders/${orderNumber}" 
                               style="display: inline-block; padding: 10px 20px; background: #FF6B00; color: white; text-decoration: none; border-radius: 5px;">
                                Voir les détails
                            </a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        return await this.sendEmail(email, subject, html);
    }
}

// Singleton
module.exports = new EmailService();