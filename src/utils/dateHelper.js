/**
 * Utilitaires de manipulation de dates
 */

const formatDate = (date, format = 'YYYY-MM-DD') => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    switch (format) {
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'YYYY-MM-DD HH:mm:ss':
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        default:
            return d.toISOString();
    }
};

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const addHours = (date, hours) => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
};

const getStartOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const getEndOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

const getDateRange = (period) => {
    const now = new Date();
    let start, end;

    switch (period) {
        case 'today':
            start = getStartOfDay(now);
            end = getEndOfDay(now);
            break;
        case 'yesterday':
            const yesterday = addDays(now, -1);
            start = getStartOfDay(yesterday);
            end = getEndOfDay(yesterday);
            break;
        case 'week':
            start = addDays(now, -7);
            end = now;
            break;
        case 'month':
            start = addDays(now, -30);
            end = now;
            break;
        default:
            start = addDays(now, -7);
            end = now;
    }

    return { start, end };
};

module.exports = {
    formatDate,
    addDays,
    addHours,
    getStartOfDay,
    getEndOfDay,
    getDateRange
};