/**
 * Utilitaires de manipulation de chaînes
 */

const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
};

const truncate = (text, length = 100, suffix = '...') => {
    if (text.length <= length) return text;
    return text.substring(0, length).trim() + suffix;
};

const capitalize = (text) => {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const generateRandomString = (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const maskPhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/(\+\d{3})(\d{2})(\d{2})(\d{2})(\d+)/, '$1 ** ** $4 $5');
};

const maskEmail = (email) => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    const maskedName = name.substring(0, 3) + '***' + name.substring(name.length - 2);
    return `${maskedName}@${domain}`;
};

module.exports = {
    slugify,
    truncate,
    capitalize,
    generateRandomString,
    maskPhone,
    maskEmail
};