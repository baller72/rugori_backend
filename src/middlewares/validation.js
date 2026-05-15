const AppError = require('../utils/AppError');

/**
 * Middleware de validation avec Joi
 */
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { 
            abortEarly: false,
            stripUnknown: true 
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return next(new AppError('Validation error', 400, errors));
        }

        next();
    };
};

/**
 * Validation des paramètres de requête
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.query, { 
            abortEarly: false,
            stripUnknown: true 
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return next(new AppError('Invalid query parameters', 400, errors));
        }

        next();
    };
};

module.exports = {
    validate,
    validateQuery
};