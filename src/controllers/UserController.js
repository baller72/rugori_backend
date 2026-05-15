const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { updateProfileSchema } = require('../utils/validationSchemas');
const logger = require('../utils/logger');

/**
 * Contrôleur de gestion des utilisateurs
 */
class UserController {
    /**
     * Mise à jour du profil utilisateur connecté
     */
    static updateProfile = asyncHandler(async (req, res) => {
        const { error, value } = updateProfileSchema.validate(req.body);
        if (error) {
            throw new AppError(error.details[0].message, 400);
        }

        const { current_password, new_password, ...profileData } = value;

        // Si changement de mot de passe demandé
        if (new_password) {
            await AuthService.changePassword(req.user.id, current_password, new_password);
        }

        // Mise à jour des informations du profil
        if (Object.keys(profileData).length > 0) {
            await User.updateProfile(req.user.id, profileData);
        }

        const updatedUser = await User.findById(req.user.id);

        logger.info(`User ${req.user.id} updated profile`);

        res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: updatedUser.id,
                    uuid: updatedUser.uuid,
                    full_name: updatedUser.full_name,
                    email: updatedUser.email,
                    phone: updatedUser.phone,
                    role: updatedUser.role,
                    vehicle_info: updatedUser.vehicle_info,
                    is_available: updatedUser.is_available
                }
            }
        });
    });

    /**
     * Récupération d'un utilisateur par ID (admin)
     */
    static getUserById = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const user = await User.findById(id);
        
        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        res.status(200).json({
            status: 'success',
            data: { user }
        });
    });

    /**
     * Liste des utilisateurs avec filtres (admin)
     */
    static getAllUsers = asyncHandler(async (req, res) => {
        const filters = {
            role: req.query.role,
            is_verified: req.query.is_verified,
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0
        };

        const users = await User.findAll(filters);
        const total = await User.count(filters);

        res.status(200).json({
            status: 'success',
            results: users.length,
            total,
            data: { users }
        });
    });

    /**
     * Mise à jour d'un utilisateur (admin)
     */
    static updateUser = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;

        const user = await User.findById(id);
        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        // Empêcher la modification de l'email
        delete updateData.email;
        delete updateData.password_hash;

        await User.updateProfile(id, updateData);

        const updatedUser = await User.findById(id);

        logger.info(`Admin ${req.user.id} updated user ${id}`);

        res.status(200).json({
            status: 'success',
            data: { user: updatedUser }
        });
    });

    /**
     * Suppression d'un utilisateur (admin)
     */
    static deleteUser = asyncHandler(async (req, res) => {
        const { id } = req.params;

        if (parseInt(id) === req.user.id) {
            throw new AppError('Vous ne pouvez pas supprimer votre propre compte', 400);
        }

        const deleted = await User.delete(id);
        
        if (!deleted) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        logger.info(`Admin ${req.user.id} deleted user ${id}`);

        res.status(200).json({
            status: 'success',
            data: { message: 'Utilisateur supprimé avec succès' }
        });
    });

    /**
     * Création d'un utilisateur (admin)
     */
    static createUser = asyncHandler(async (req, res) => {
        const { full_name, email, phone, password, role, vehicle_info } = req.body;

        // Validation basique
        if (!full_name || !email || !phone || !password || !role) {
            throw new AppError('Tous les champs requis doivent être remplis', 400);
        }

        // Vérification email unique
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
            throw new AppError('Cet email est déjà utilisé', 409);
        }

        // Vérification téléphone unique
        const existingPhone = await User.findByPhone(phone);
        if (existingPhone) {
            throw new AppError('Ce numéro de téléphone est déjà utilisé', 409);
        }

        const user = await User.create({
            full_name,
            email,
            phone,
            password,
            role,
            vehicle_info
        });

        // Marquer comme vérifié car créé par admin
        const verifySql = `UPDATE users SET is_verified = TRUE WHERE id = ?`;
        await db.query(verifySql, [user.id]);

        logger.info(`Admin ${req.user.id} created user ${user.id}`);

        res.status(201).json({
            status: 'success',
            data: { user }
        });
    });

    /**
     * Statistiques utilisateurs (admin)
     */
    static getUserStats = asyncHandler(async (req, res) => {
        const stats = await User.getStats();

        res.status(200).json({
            status: 'success',
            data: { stats }
        });
    });

    /**
     * Liste des livreurs (admin/client)
     */
    static getLivreurs = asyncHandler(async (req, res) => {
        const livreurs = await User.findAvailableLivreurs();

        res.status(200).json({
            status: 'success',
            results: livreurs.length,
            data: { livreurs }
        });
    });
}

module.exports = UserController;