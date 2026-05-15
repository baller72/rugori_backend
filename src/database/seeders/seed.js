require('dotenv').config();
const db = require('../../database/pool');
const { hashPassword } = require('../../utils/cryptoHelper');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

const seedDatabase = async () => {
    try {
        logger.info('🌱 Starting database seeding...');

        // Hash du mot de passe par défaut
        const defaultPassword = await hashPassword('Password123!');

        // 1. Création des utilisateurs de test
        const users = [
            {
                uuid: uuidv4(),
                full_name: 'Admin Principal',
                email: 'admin@rugorigaz.bi',
                phone: '+25700000000',
                password_hash: defaultPassword,
                role: 'admin',
                is_verified: true
            },
            {
                uuid: uuidv4(),
                full_name: 'Jean Livreur',
                email: 'livreur@rugorigaz.bi',
                phone: '+25700000001',
                password_hash: defaultPassword,
                role: 'livreur',
                vehicle_info: 'Moto - Rouge',
                is_available: true,
                is_verified: true
            },
            {
                uuid: uuidv4(),
                full_name: 'Marie Cliente',
                email: 'client@example.com',
                phone: '+25761234567',
                password_hash: defaultPassword,
                role: 'client',
                is_verified: true
            }
        ];

        for (const user of users) {
            const sql = `
                INSERT INTO users (uuid, full_name, email, phone, password_hash, role, vehicle_info, is_available, is_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)
            `;
            await db.query(sql, [
                user.uuid, user.full_name, user.email, user.phone,
                user.password_hash, user.role, user.vehicle_info || null,
                user.is_available || false, user.is_verified
            ]);
        }

        // 2. Création des catégories
        const categories = [
            { name: 'Gaz 6kg', description: 'Bouteilles de gaz de 6 kilogrammes' },
            { name: 'Gaz 12kg', description: 'Bouteilles de gaz de 12 kilogrammes' },
            { name: 'Kits Complets', description: 'Kit bouteille pleine + détendeur + collier' }
        ];

        for (const cat of categories) {
            const sql = `
                INSERT INTO categories (name, description)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE description = VALUES(description)
            `;
            await db.query(sql, [cat.name, cat.description]);
        }

        // 3. Création des produits
        const products = [
            {
                sku: 'GAZ-6KG-001',
                name: 'Bouteille Gaz 6kg (Recharge)',
                description: 'Recharge de gaz butane 6kg',
                price: 25000.00,
                stock_quantity: 150,
                weight_kg: 6.0,
                is_kit: false,
                is_featured: true,
                gas_type: 'Butane'
            },
            {
                sku: 'GAZ-12KG-001',
                name: 'Bouteille Gaz 12kg (Recharge)',
                description: 'Recharge de gaz butane 12kg',
                price: 45000.00,
                stock_quantity: 100,
                weight_kg: 12.0,
                is_kit: false,
                is_featured: false,
                gas_type: 'Butane'
            },
            {
                sku: 'KIT-6KG-001',
                name: 'Kit Complet Gaz 6kg',
                description: 'Bouteille pleine 6kg + Détendeur + Collier',
                price: 85000.00,
                stock_quantity: 50,
                weight_kg: 6.0,
                is_kit: true,
                is_featured: true,
                gas_type: 'Butane'
            }
        ];

        for (const product of products) {
            const sql = `
                INSERT INTO products (sku, name, description, price, stock_quantity, weight_kg, is_kit, is_featured, gas_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE name = VALUES(name)
            `;
            await db.query(sql, [
                product.sku, product.name, product.description, product.price,
                product.stock_quantity, product.weight_kg, product.is_kit,
                product.is_featured, product.gas_type
            ]);
        }

        logger.info('✅ Database seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

// Exécution
seedDatabase();