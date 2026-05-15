const Notification = require('../models/Notification');

class NotificationService {
    static async create(data) {
        return await Notification.create(data);
    }

    static async createMany(notifications) {
        return await Notification.createMany(notifications);
    }

    static async getUserNotifications(userId, limit = 50) {
        return await Notification.findByUser(userId, limit);
    }

    static async markAsRead(notificationId, userId) {
        return await Notification.markAsRead(notificationId, userId);
    }

    static async markAllAsRead(userId) {
        return await Notification.markAllAsRead(userId);
    }
}

module.exports = NotificationService;