module.exports = {
    // Rôles utilisateur
    ROLES: {
        CLIENT: 'client',
        LIVREUR: 'livreur',
        ADMIN: 'admin'
    },

    // Statuts de commande
    ORDER_STATUS: {
        PENDING_PAYMENT: 'pending_payment',
        PAYMENT_VERIFIED: 'payment_verified',
        PREPARING: 'preparing',
        READY_FOR_DELIVERY: 'ready_for_delivery',
        OUT_FOR_DELIVERY: 'out_for_delivery',
        DELIVERED: 'delivered',
        CANCELLED: 'cancelled',
        FAILED_DELIVERY: 'failed_delivery'
    },

    // Statuts de preuve de paiement
    PAYMENT_STATUS: {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected'
    },

    // Méthodes de validation de livraison
    DELIVERY_VALIDATION_METHODS: {
        QR_SCAN: 'qr_scan',
        MANUAL_CODE: 'manual_code',
        CUSTOMER_SIGNATURE: 'customer_signature'
    },

    // Types d'audit
    AUDIT_ACTIONS: {
        LOGIN: 'LOGIN',
        LOGOUT: 'LOGOUT',
        CREATE_ORDER: 'CREATE_ORDER',
        UPDATE_ORDER_STATUS: 'UPDATE_ORDER_STATUS',
        VALIDATE_PAYMENT: 'VALIDATE_PAYMENT',
        ASSIGN_DELIVERY: 'ASSIGN_DELIVERY',
        COMPLETE_DELIVERY: 'COMPLETE_DELIVERY',
        CREATE_PRODUCT: 'CREATE_PRODUCT',
        UPDATE_PRODUCT: 'UPDATE_PRODUCT',
        DELETE_PRODUCT: 'DELETE_PRODUCT'
    },

    // Types de notification
    NOTIFICATION_TYPES: {
        ORDER_STATUS: 'order_status',
        PAYMENT: 'payment',
        DELIVERY: 'delivery',
        MESSAGE: 'message',
        SYSTEM: 'system'
    }
};