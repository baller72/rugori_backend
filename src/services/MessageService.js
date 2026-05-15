const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { NOTIFICATION_TYPES } = require('../config/constants');

class MessageService {
    static async sendMessage(data) {
        return await Message.create(data);
    }

    static async getConversation(orderId, userId) {
        return await Message.findByOrder(orderId);
    }
}

module.exports = MessageService;