const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Middleware d'audit pour les actions sensibles
 */
const auditAction = (action, entityType, getEntityId = null) => {
    return async (req, res, next) => {
        // Sauvegarde de la réponse originale
        const originalJson = res.json;
        
        res.json = function(data) {
            // Restauration de la méthode originale
            res.json = originalJson;
            
            // Si la réponse est un succès, enregistrer l'audit
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const entityId = getEntityId ? getEntityId(req, data) : req.params.id;
                
                AuditLog.create({
                    user_id: req.user?.id || null,
                    actor_id: req.user?.id || null,
                    action,
                    entity_type: entityType,
                    entity_id: entityId,
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent')
                }).catch(err => logger.error('Failed to create audit log:', err));
            }
            
            return originalJson.call(this, data);
        };
        
        next();
    };
};

module.exports = {
    auditAction
};