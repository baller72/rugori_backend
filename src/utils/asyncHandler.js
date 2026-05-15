/**
 * Wrapper pour gérer automatiquement les erreurs dans les contrôleurs asynchrones
 * Évite d'avoir à utiliser try/catch dans chaque contrôleur
 * 
 * @param {Function} fn - Fonction asynchrone du contrôleur
 * @returns {Function} Middleware Express avec gestion d'erreur
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = asyncHandler;