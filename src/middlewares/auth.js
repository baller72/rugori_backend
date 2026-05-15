const { verifyToken } = require('../utils/jwtHelper');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { ROLES } = require('../config/constants');

/**
 * Middleware d'authentification JWT
 */
const authenticate = async (req, res, next) => {
    try {
        // Récupération du token
        let token;
        
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            throw new AppError('Vous n\'êtes pas connecté. Veuillez vous connecter.', 401);
        }

        // Vérification du token
        const decoded = verifyToken(token);
        
        if (!decoded) {
            throw new AppError('Token invalide ou expiré. Veuillez vous reconnecter.', 401);
        }

        // Vérification que l'utilisateur existe toujours
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            throw new AppError('L\'utilisateur associé à ce token n\'existe plus.', 401);
        }

        // Ajout de l'utilisateur à la requête
        req.user = {
            id: user.id,
            uuid: user.uuid,
            email: user.email,
            role: user.role,
            full_name: user.full_name
        };

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware de restriction par rôle
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError('Vous n\'êtes pas authentifié.', 401));
        }

        if (!roles.includes(req.user.role)) {
            return next(new AppError('Vous n\'avez pas les droits pour effectuer cette action.', 403));
        }

        next();
    };
};

/**
 * Middleware pour vérifier la propriété de la ressource
 */
const checkOwnership = (resourceType) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            const resourceId = req.params.id || req.params.orderId || req.body.user_id;

            if (!resourceId) {
                return next();
            }

            // Les admins ont tous les droits
            if (req.user.role === ROLES.ADMIN) {
                return next();
            }

            let hasAccess = false;

            switch (resourceType) {
                case 'order':
                    const order = await Order.findById(resourceId);
                    hasAccess = order && order.user_id === userId;
                    break;
                case 'profile':
                    hasAccess = parseInt(resourceId) === userId;
                    break;
                default:
                    hasAccess = false;
            }

            if (!hasAccess) {
                throw new AppError('Vous n\'avez pas accès à cette ressource.', 403);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = {
    authenticate,
    restrictTo,
    checkOwnership
};