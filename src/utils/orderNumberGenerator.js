/**
 * Génère un numéro de commande unique au format: RGZ-YYYYMMDD-XXX
 * Format: RGZ-20260413-001
 * 
 * @param {Number} sequence - Numéro de séquence pour la journée
 * @returns {String} Numéro de commande formaté
 */
const generateOrderNumber = (sequence) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const seq = String(sequence).padStart(3, '0');
    
    return `RGZ-${year}${month}${day}-${seq}`;
};

/**
 * Obtient le prochain numéro de séquence pour aujourd'hui
 * @param {Object} connection - Connexion MySQL
 * @returns {Promise<Object>} Objet contenant orderNumber et sequence
 */
const getNextOrderSequence = async (connection) => {
    const today = new Date().toISOString().split('T')[0];
    
    const [rows] = await connection.execute(
        `SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = ?`,
        [today]
    );
    
    const sequence = rows[0].count + 1;
    const orderNumber = generateOrderNumber(sequence);
    
    return { orderNumber, sequence };
};

module.exports = {
    generateOrderNumber,
    getNextOrderSequence
};