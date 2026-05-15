const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Contrôleur de notifications
 */
class NotificationController {
    /**
     * Récupération des notifications de l'utilisateur
     */
    static getMyNotifications = asyncHandler(async (req, res) => {
        const limit = parseInt(req.query.limit) || 50;
        const includeRead = req.query.include_read === 'true';

        const notifications = await Notification.findByUser(req.user.id, limit, includeRead);
        const unreadCount = await Notification.countUnread(req.user.id);

        res.status(200).json({
            status: 'success',
            results: notifications.length,
            unread_count: unreadCount,
            data: { notifications }
        });
    });

    /**
     * Marquer une notification comme lue
     */
    static markAsRead = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result = await Notification.markAsRead(id, req.user.id);

        if (result.affectedRows === 0) {
            throw new AppError('Notification non trouvée', 404);
        }

        res.status(200).json({
            status: 'success',
            data: { message: 'Notification marquée comme lue' }
        });
    });

    /**
     * Marquer toutes les notifications comme lues
     */
    static markAllAsRead = asyncHandler(async (req, res) => {
        const result = await Notification.markAllAsRead(req.user.id);

        res.status(200).json({
            status: 'success',
            data: { 
                message: `${result.affectedRows} notification(s) marquée(s) comme lue(s)`,
                marked_count: result.affectedRows
            }
        });
    });

    /**
     * Supprimer une notification
     */
    static deleteNotification = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const sql = `DELETE FROM notifications WHERE id = ? AND user_id = ?`;
        const result = await db.query(sql, [id, req.user.id]);

        if (result.affectedRows === 0) {
            throw new AppError('Notification non trouvée', 404);
        }

        res.status(200).json({
            status: 'success',
            data: { message: 'Notification supprimée' }
        });
    });

    /**
     * Compteur de notifications non lues
     */
    static getUnreadCount = asyncHandler(async (req, res) => {
        const count = await Notification.countUnread(req.user.id);

        res.status(200).json({
            status: 'success',
            data: { unread_count: count }
        });
    });
}

module.exports = NotificationController;