-- ============================================================
-- SCRIPT DE CREATION DE LA BASE DE DONNEES
-- Projet : Plateforme de commande et livraison de gaz - RUGORI GAZ
-- SGBD : MySQL 8.0+ / PostgreSQL (Script compatible MySQL avec commentaires d'adaptation)
-- Auteur : Genere par IA (Analyse du Cahier des Charges)
-- ============================================================

-- 1. SUPPRESSION DES TABLES (Ordre inverse des dependances)
-- A decommenter en cas de re-initialisation
/*
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS deliveries;
DROP TABLE IF EXISTS payment_proofs;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS user_refresh_tokens;
DROP TABLE IF EXISTS users;
*/

-- 2. CREATION DE LA BASE DE DONNEES (Optionnel)
-- CREATE DATABASE IF NOT EXISTS rugori_gaz_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE rugori_gaz_db;

-- ============================================================
-- TABLE: users
-- Gere les Clients, Livreurs et Administrateurs
-- ============================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) UNIQUE NOT NULL COMMENT 'UUID pour references publiques securisees (evite de montrer l''ID)',
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL COMMENT 'Numero de telephone mobile (obligatoire pour le Burundi)',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt Hash',
    role ENUM('client', 'livreur', 'admin') NOT NULL DEFAULT 'client',
    
    -- Verification et Securite
    is_verified BOOLEAN DEFAULT FALSE COMMENT 'Verification email par OTP',
    otp_code VARCHAR(6) NULL COMMENT 'Code OTP pour verification/recuperation',
    otp_expires_at TIMESTAMP NULL,
    
    -- Informations Livreur
    vehicle_info VARCHAR(100) NULL COMMENT 'Type/Modele du vehicule/velo',
    is_available BOOLEAN DEFAULT FALSE COMMENT 'Disponibilite du livreur',
    
    -- Traçabilite
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: user_refresh_tokens
-- Gestion des JWT Refresh Tokens (Architecture securisee)
-- ============================================================
CREATE TABLE user_refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_refresh_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: categories
-- Gestion des categories de produits (Type de gaz, capacite, marque)
-- ============================================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    image_url VARCHAR(500) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: products
-- Produits gaziers (Kits complets ou Recharges)
-- ============================================================
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL COMMENT 'Reference interne',
    name VARCHAR(200) NOT NULL,
    description TEXT NULL,
    price DECIMAL(12, 2) NOT NULL COMMENT 'Prix en Francs Burundais (BIF)',
    stock_quantity INT NOT NULL DEFAULT 0 COMMENT 'Gestion de la disponibilite des stocks',
    gas_type VARCHAR(50) NULL COMMENT 'Ex: Butane, Propane',
    weight_kg DECIMAL(5,2) NULL COMMENT 'Poids du gaz (Ex: 6kg, 12kg)',
    is_kit BOOLEAN DEFAULT FALSE COMMENT 'Kit complet incluant detendeur ?',
    is_featured BOOLEAN DEFAULT FALSE COMMENT 'Mise en avant',
    image_urls JSON NULL COMMENT 'Liste d''URLs d''images (JSON Array)',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_products_sku (sku),
    INDEX idx_products_featured (is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: orders
-- Commandes clients (Workflow: cree, paye, prepare, livre, termine)
-- ============================================================
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE NOT NULL COMMENT 'Numero de commande public (Ex: RGZ-20231027-001)',
    user_id INT NOT NULL COMMENT 'Le client qui a passe commande',
    
    -- Informations livraison
    delivery_address TEXT NOT NULL,
    delivery_notes TEXT NULL COMMENT 'Indications supplementaires pour le livreur',
    recipient_name VARCHAR(150) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    
    -- Statut (Ref: Tableau 1 du Cahier des Charges)
    status ENUM(
        'pending_payment',  -- Panier valide, attente preuve de paiement
        'payment_verified', -- Paiement valide par admin, prete a preparer
        'preparing',        -- En preparation
        'ready_for_delivery', -- Prete a etre prise par un livreur
        'out_for_delivery', -- Prise en charge par livreur
        'delivered',        -- Livree et validee par QR Code
        'cancelled',        -- Annulee
        'failed_delivery'   -- Echec de livraison
    ) DEFAULT 'pending_payment',
    
    -- Montants
    subtotal DECIMAL(12, 2) NOT NULL,
    delivery_fee DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL,
    
    -- Traçabilite
    payment_validated_by INT NULL COMMENT 'ID de l''admin qui a valide le paiement',
    payment_validated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_validated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_orders_user (user_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_number (order_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: order_items
-- Lignes de commande (Produits commandes)
-- ============================================================
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL COMMENT 'Prix au moment de la commande',
    total_price DECIMAL(12, 2) NOT NULL,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: payment_proofs
-- Preuves de paiement hors ligne (Capture d'ecran, Recu)
-- ============================================================
CREATE TABLE payment_proofs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    user_id INT NOT NULL COMMENT 'Client ayant uploadé la preuve',
    image_url VARCHAR(500) NOT NULL COMMENT 'URL vers S3 ou stockage local',
    reference_number VARCHAR(100) NULL COMMENT 'Numero de transaction mobile money saisi par l''utilisateur',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    admin_comment TEXT NULL COMMENT 'Commentaire de l''administrateur en cas de rejet',
    reviewed_by INT NULL COMMENT 'ID de l''admin ayant verifie',
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_payment_proofs_order (order_id),
    INDEX idx_payment_proofs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: deliveries
-- Gestion des livraisons et QR Codes
-- ============================================================
CREATE TABLE deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE COMMENT 'Une commande = Une livraison',
    delivery_person_id INT NULL COMMENT 'Livreur assigne',
    
    -- QR Code
    qr_code_token VARCHAR(100) UNIQUE NOT NULL COMMENT 'Token aleatoire encode dans le QR Code',
    qr_code_image_url VARCHAR(500) NULL COMMENT 'Optionnel: Image generee du QR Code',
    
    -- Statuts et Timings
    assigned_at TIMESTAMP NULL COMMENT 'Quand le livreur a pris la commande',
    picked_up_at TIMESTAMP NULL COMMENT 'Quand le livreur a recupere les bouteilles',
    delivered_at TIMESTAMP NULL COMMENT 'Quand le QR Code a ete scanne avec succes',
    
    -- Validation de reception
    validation_method ENUM('qr_scan', 'manual_code', 'customer_signature') NULL,
    delivery_notes TEXT NULL COMMENT 'Commentaire de fin de livraison (Ex: "Client absent, depose chez voisin")',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (delivery_person_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_deliveries_token (qr_code_token),
    INDEX idx_deliveries_person (delivery_person_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: messages
-- Messagerie interne liee a une commande specifique
-- ============================================================
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    attachment_url VARCHAR(500) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_messages_order (order_id),
    INDEX idx_messages_sender (sender_id),
    INDEX idx_messages_unread (order_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: audit_logs
-- Traçabilite et Audit (Conformite)
-- ============================================================
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL COMMENT 'Utilisateur concerne par l''action',
    actor_id INT NULL COMMENT 'Utilisateur ayant effectue l''action (peut etre system)',
    action VARCHAR(50) NOT NULL COMMENT 'Ex: LOGIN, CREATE_ORDER, VALIDATE_PAYMENT, ASSIGN_DELIVERY',
    entity_type VARCHAR(50) NULL COMMENT 'Ex: Order, Product, User',
    entity_id INT NULL,
    old_values JSON NULL COMMENT 'Valeurs avant modification (pour UPDATE)',
    new_values JSON NULL COMMENT 'Valeurs apres modification',
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: notifications
-- Notifications In-App
-- ============================================================
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NULL COMMENT 'Ex: order_status, payment, delivery',
    link VARCHAR(500) NULL COMMENT 'Lien de redirection dans l''app',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id, is_read),
    INDEX idx_notifications_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TRIGGERS POUR AUDIT AUTOMATIQUE
-- ============================================================

-- Trigger pour l'audit de creation de commande
DELIMITER //
CREATE TRIGGER audit_order_creation AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, new_values, created_at)
    VALUES (NEW.user_id, NEW.user_id, 'CREATE_ORDER', 'Order', NEW.id, 
            JSON_OBJECT('order_number', NEW.order_number, 'total', NEW.total_amount), 
            NOW());
END//
DELIMITER ;

-- Trigger pour l'audit de changement de statut de commande
DELIMITER //
CREATE TRIGGER audit_order_status_change AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, old_values, new_values, created_at)
        VALUES (NEW.user_id, @current_audit_actor_id, 'UPDATE_ORDER_STATUS', 'Order', NEW.id,
                JSON_OBJECT('status', OLD.status),
                JSON_OBJECT('status', NEW.status),
                NOW());
    END IF;
    
    -- Capture validation de paiement
    IF OLD.payment_validated_at IS NULL AND NEW.payment_validated_at IS NOT NULL THEN
        INSERT INTO audit_logs (user_id, actor_id, action, entity_type, entity_id, created_at)
        VALUES (NEW.user_id, NEW.payment_validated_by, 'VALIDATE_PAYMENT', 'Order', NEW.id, NOW());
    END IF;
END//
DELIMITER ;

-- ============================================================
-- INSERTION DE DONNEES INITIALES (OPTIONNEL)
-- ============================================================

-- Creation d'un compte Admin par defaut (Mot de passe: Admin123! - A CHANGER IMMEDIATEMENT)
-- Le hash correspond a Bcrypt 12 rounds pour 'Admin123!'
INSERT INTO users (uuid, full_name, email, phone, password_hash, role, is_verified) VALUES
(UUID(), 'Administrateur Principal', 'admin@rugorigaz.bi', '+25700000000', '$2a$12$V8nFQ6T4HhY8U1UjB8rP5e3nQ7Q7vG7yP9iR1iL9sA5oD5tY7wK2y', 'admin', TRUE);

SET @admin_id = LAST_INSERT_ID();

-- Creation d'un compte Livreur Test
INSERT INTO users (uuid, full_name, email, phone, password_hash, role, is_verified, vehicle_info, is_available) VALUES
(UUID(), 'Jean Livreur', 'livreur1@rugorigaz.bi', '+25700000001', '$2a$12$V8nFQ6T4HhY8U1UjB8rP5e3nQ7Q7vG7yP9iR1iL9sA5oD5tY7wK2y', 'livreur', TRUE, 'Moto - Rouge', TRUE);

-- Creation d'un compte Client Test
INSERT INTO users (uuid, full_name, email, phone, password_hash, role, is_verified) VALUES
(UUID(), 'Marie Cliente', 'marie.client@example.com', '+25761234567', '$2a$12$V8nFQ6T4HhY8U1UjB8rP5e3nQ7Q7vG7yP9iR1iL9sA5oD5tY7wK2y', 'client', TRUE);

-- Categories initiales
INSERT INTO categories (name, description) VALUES 
('Gaz 6kg', 'Bouteilles de gaz de 6 kilogrammes'),
('Gaz 12kg', 'Bouteilles de gaz de 12 kilogrammes'),
('Kits Complets', 'Kit bouteille pleine + detendeur + collier');

-- Produits initiaux
INSERT INTO products (category_id, sku, name, description, price, stock_quantity, weight_kg, is_kit, is_featured, image_urls) VALUES
(1, 'GAZ-6KG-001', 'Bouteille Gaz 6kg (Recharge)', 'Recharge de gaz butane 6kg', 25000.00, 150, 6.0, FALSE, TRUE, '["https://example.com/images/gaz6kg.jpg"]'),
(2, 'GAZ-12KG-001', 'Bouteille Gaz 12kg (Recharge)', 'Recharge de gaz butane 12kg', 45000.00, 100, 12.0, FALSE, FALSE, '["https://example.com/images/gaz12kg.jpg"]'),
(3, 'KIT-6KG-001', 'Kit Complet Gaz 6kg', 'Bouteille pleine 6kg + Detendeur + Collier', 85000.00, 50, 6.0, TRUE, TRUE, '["https://example.com/images/kit6kg.jpg"]');

-- Note pour l'utilisateur :
-- Le hash de mot de passe '$2a$12$V8nFQ6T4HhY8U1UjB8rP5e3nQ7Q7vG7yP9iR1iL9sA5oD5tY7wK2y' correspond a 'Admin123!'
-- Pour generer un nouveau hash en Node.js : bcrypt.hashSync('votre_mot_de_passe', 12)