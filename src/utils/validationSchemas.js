const Joi = require('joi');

// Schéma pour création de compte client
const registerSchema = Joi.object({
    full_name: Joi.string().min(3).max(150).required()
        .messages({
            'string.empty': 'Le nom complet est requis',
            'string.min': 'Le nom doit contenir au moins 3 caractères'
        }),
    email: Joi.string().email().max(255).required()
        .messages({
            'string.email': 'Format d\'email invalide',
            'string.empty': 'L\'email est requis'
        }),
    phone: Joi.string().pattern(/^\+?[0-9]{8,15}$/).required()
        .messages({
            'string.pattern.base': 'Numéro de téléphone invalide (format Burundi: +257XXXXXXXX)',
            'string.empty': 'Le numéro de téléphone est requis'
        }),
    password: Joi.string().min(8).max(128).required()
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .messages({
            'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
            'string.pattern.base': 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
        }),
    confirm_password: Joi.string().valid(Joi.ref('password')).required()
        .messages({
            'any.only': 'Les mots de passe ne correspondent pas'
        })
});

// Schéma pour connexion
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

// Schéma pour création de commande
const createOrderSchema = Joi.object({
    delivery_address: Joi.string().min(10).max(500).required(),
    delivery_notes: Joi.string().max(500).allow('', null),
    recipient_name: Joi.string().min(3).max(150).required(),
    recipient_phone: Joi.string().pattern(/^\+?[0-9]{8,15}$/).required(),
    items: Joi.array().items(
        Joi.object({
            product_id: Joi.number().integer().positive().required(),
            quantity: Joi.number().integer().min(1).max(50).required()
        })
    ).min(1).required()
});

// Schéma pour mise à jour du profil
const updateProfileSchema = Joi.object({
    full_name: Joi.string().min(3).max(150),
    phone: Joi.string().pattern(/^\+?[0-9]{8,15}$/),
    current_password: Joi.string().when('new_password', {
        is: Joi.exist(),
        then: Joi.required()
    }),
    new_password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
}).min(1);

// Schéma pour message
const messageSchema = Joi.object({
    message: Joi.string().min(1).max(2000).required()
});

module.exports = {
    registerSchema,
    loginSchema,
    createOrderSchema,
    updateProfileSchema,
    messageSchema
};