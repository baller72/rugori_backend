const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const PaymentProof = require('../models/PaymentProof');
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const db = require('../database/pool');

/**
 * Contrôleur d'administration
 */
class AdminController {
    /**
     * Tableau de bord - Statistiques générales
     */
    static getDashboardStats = asyncHandler(async (req, res) => {
        const { date_from, date_to } = req.query;

        // Stats des commandes
        const orderStats = await Order.getStats();
        
        // Stats des utilisateurs
        const userStats = await User.getStats();
        
        // Stats des produits
        const productStats = await Product.getStats();

        // Revenus par période
        const revenueStats = await Order.getRevenueStats('month');

        // Commandes récentes
        const recentOrders = await Order.findAll({ limit: 10 });

        // Preuves de paiement en attente
        const pendingPayments = await PaymentProof.findPending();

        res.status(200).json({
            status: 'success',
            data: {
                overview: {
                    total_orders: orderStats.total_orders,
                    total_revenue: orderStats.total_revenue,
                    total_users: userStats.total_users,
                    total_products: productStats.total_products,
                    pending_payments: pendingPayments.length,
                    orders_today: orderStats.orders_today,
                    new_users_today: userStats.new_today
                },
                order_stats: orderStats,
                user_stats: userStats,
                product_stats: productStats,
                revenue_stats: revenueStats,
                recent_orders: recentOrders,
                pending_payments_count: pendingPayments.length
            }
        });
    });

    /**
     * Logs d'audit
     */
    static getAuditLogs = asyncHandler(async (req, res) => {
        const filters = {
            user_id: req.query.user_id,
            actor_id: req.query.actor_id,
            action: req.query.action,
            entity_type: req.query.entity_type,
            entity_id: req.query.entity_id,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            limit: parseInt(req.query.limit) || 100,
            offset: parseInt(req.query.offset) || 0
        };

        const logs = await AuditLog.findAll(filters);

        res.status(200).json({
            status: 'success',
            results: logs.length,
            data: { logs }
        });
    });

    /**
     * Historique d'une entité
     */
    static getEntityHistory = asyncHandler(async (req, res) => {
        const { entityType, entityId } = req.params;

        const history = await AuditLog.getEntityHistory(entityType, entityId);

        res.status(200).json({
            status: 'success',
            results: history.length,
            data: { history }
        });
    });

    /**
     * Configuration système (admin uniquement)
     */
    static getSystemConfig = asyncHandler(async (req, res) => {
        // À implémenter avec une table de configuration
        res.status(200).json({
            status: 'success',
            data: {
                config: {
                    delivery_fee: 5000,
                    max_order_items: 50,
                    low_stock_threshold: 5
                }
            }
        });
    });

    /**
     * Rapport d'activité
     */
    static getActivityReport = asyncHandler(async (req, res) => {
        const { period = 'daily' } = req.query;
        const days = period === 'daily' ? 30 : period === 'weekly' ? 12 : 12;

        let dateFormat;
        if (period === 'daily') dateFormat = '%Y-%m-%d';
        else if (period === 'weekly') dateFormat = '%Y-%U';
        else dateFormat = '%Y-%m';

        const sql = `
            SELECT 
                DATE_FORMAT(created_at, ?) as period_label,
                COUNT(*) as total_actions,
                COUNT(DISTINCT actor_id) as unique_users,
                SUM(CASE WHEN action = 'LOGIN' THEN 1 ELSE 0 END) as logins,
                SUM(CASE WHEN action = 'CREATE_ORDER' THEN 1 ELSE 0 END) as orders_created,
                SUM(CASE WHEN action = 'COMPLETE_DELIVERY' THEN 1 ELSE 0 END) as deliveries_completed
            FROM audit_logs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY period_label
            ORDER BY period_label DESC
        `;

        const report = await db.query(sql, [dateFormat, days]);

        res.status(200).json({
            status: 'success',
            data: { 
                period,
                days_analyzed: days,
                report 
            }
        });
    });
}

module.exports = AdminController;