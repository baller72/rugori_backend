const AuthService = require('../services/AuthService');
const asyncHandler = require('../utils/asyncHandler');
const { registerSchema, loginSchema } = require('../utils/validationSchemas');
const AppError = require('../utils/AppError');
const User = require('../models/User')

/**
 * Contrôleur d'authentification
 */
class AuthController {
    /**
     * Inscription client
     */
    static register = asyncHandler(async (req, res) => {
        const { error, value } = registerSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const result = await AuthService.register(value, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(201).json({
            status: 'success',
            data: result
        });
    });

    /**
     * Connexion
     */
    static login = asyncHandler(async (req, res) => {
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const { email, password } = value;

        const result = await AuthService.login(email, password, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(200).json({
            status: 'success',
            data: result
        });
    });

    /**
     * Vérification OTP
     */
    static verifyOTP = asyncHandler(async (req, res) => {
        const { email, otp } = req.body;

        if (!email || !otp) {
            throw new AppError('Email et code OTP requis', 400);
        }

        const result = await AuthService.verifyOTP(email, otp);

        res.status(200).json({
            status: 'success',
            data: result
        });
    });

    /**
     * Renvoi OTP
     */
    static resendOTP = asyncHandler(async (req, res) => {
        const { email } = req.body;

        if (!email) {
            throw new AppError('Email requis', 400);
        }

        const result = await AuthService.resendOTP(email);

        res.status(200).json({
            status: 'success',
            data: result
        });
    });

    /**
     * Rafraîchissement token
     */
    static refreshToken = asyncHandler(async (req, res) => {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw new AppError('Refresh token requis', 400);
        }

        const tokens = await AuthService.refreshAccessToken(refreshToken);

        res.status(200).json({
            status: 'success',
            data: { tokens }
        });
    });

    /**
     * Déconnexion
     */
    static logout = asyncHandler(async (req, res) => {
        const { refreshToken } = req.body;
        const userId = req.user?.id;

        const result = await AuthService.logout(refreshToken, userId, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(200).json({
            status: 'success',
            data: result
        });
    });

    /**
     * Changement de mot de passe
     */
    static changePassword = asyncHandler(async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            throw new AppError('Mot de passe actuel et nouveau mot de passe requis', 400);
        }

        const result = await AuthService.changePassword(userId, currentPassword, newPassword);

        res.status(200).json({
            status: 'success',
            data: result
        });
    });

    /**
     * Mot de passe oublié
     */
    static forgotPassword = asyncHandler(async (req, res) => {
        const { email } = req.body;

        if (!email) {
            throw new AppError('Email requis', 400);
        }

        const result = await AuthService.forgotPassword(email);

        res.status(200).json({
            status: 'success',
            data: result
        });
    });

    /**
     * Réinitialisation mot de passe
     */
    static resetPassword = asyncHandler(async (req, res) => {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            throw new AppError('Email, code OTP et nouveau mot de passe requis', 400);
        }

        const result = await AuthService.resetPassword(email, otp, newPassword);

        res.status(200).json({
            status: 'success',
            data: result
        });
    });

    /**
     * Récupération du profil utilisateur connecté
     */
    static getMe = asyncHandler(async (req, res) => {
        const user = await User.findById(req.user.id);

        res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: user.id,
                    uuid: user.uuid,
                    full_name: user.full_name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    is_verified: user.is_verified,
                    vehicle_info: user.vehicle_info,
                    is_available: user.is_available,
                    created_at: user.created_at
                }
            }
        });
    });
}

module.exports = AuthController;