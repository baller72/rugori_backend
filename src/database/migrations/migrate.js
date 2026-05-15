require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../pool');
const logger = require('../../utils/logger');

/**
 * Script de migration de base de données
 */
class MigrationRunner {
    constructor() {
        this.migrationsDir = __dirname;
        this.migrationsTable = 'migrations';
    }

    async init() {
        // Création de la table de migrations si elle n'existe pas
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await db.query(createTableSQL);
        logger.info('✅ Migrations table ready');
    }

    async getExecutedMigrations() {
        const sql = `SELECT name FROM ${this.migrationsTable} ORDER BY id`;
        const rows = await db.query(sql);
        return rows.map(r => r.name);
    }

    async getMigrationFiles() {
        const files = fs.readdirSync(this.migrationsDir)
            .filter(f => f.endsWith('.sql') && f !== 'migrate.js')
            .sort();
        return files;
    }

    async runMigration(filename) {
        const filepath = path.join(this.migrationsDir, filename);
        const sql = fs.readFileSync(filepath, 'utf8');

        logger.info(`Running migration: ${filename}`);

        await db.transaction(async (connection) => {
            // Exécuter le script SQL
            await connection.query(sql);

            // Enregistrer la migration
            await connection.query(
                `INSERT INTO ${this.migrationsTable} (name) VALUES (?)`,
                [filename]
            );
        });

        logger.info(`✅ Migration completed: ${filename}`);
    }

    async migrate() {
        try {
            await this.init();

            const executedMigrations = await this.getExecutedMigrations();
            const migrationFiles = await this.getMigrationFiles();

            const pendingMigrations = migrationFiles.filter(
                f => !executedMigrations.includes(f)
            );

            if (pendingMigrations.length === 0) {
                logger.info('No pending migrations');
                return;
            }

            logger.info(`Found ${pendingMigrations.length} pending migration(s)`);

            for (const migration of pendingMigrations) {
                await this.runMigration(migration);
            }

            logger.info('🎉 All migrations completed successfully!');
        } catch (error) {
            logger.error('Migration failed:', error);
            throw error;
        }
    }

    async rollback() {
        const sql = `
            SELECT name FROM ${this.migrationsTable} 
            ORDER BY id DESC LIMIT 1
        `;
        const lastMigration = await db.queryOne(sql);

        if (!lastMigration) {
            logger.info('No migrations to rollback');
            return;
        }

        logger.info(`Rolling back: ${lastMigration.name}`);

        // Note: Le rollback automatique nécessite des scripts down
        // À implémenter selon les besoins

        await db.query(
            `DELETE FROM ${this.migrationsTable} WHERE name = ?`,
            [lastMigration.name]
        );

        logger.info('✅ Rollback completed');
    }

    async status() {
        await this.init();

        const executedMigrations = await this.getExecutedMigrations();
        const migrationFiles = await this.getMigrationFiles();

        console.log('\n📊 Migration Status:');
        console.log('===================');

        migrationFiles.forEach(file => {
            const status = executedMigrations.includes(file) ? '✅ Executed' : '⏳ Pending';
            console.log(`  ${status.padEnd(15)} ${file}`);
        });
    }
}

// Exécution
const runner = new MigrationRunner();
const command = process.argv[2] || 'migrate';

runner[command]()
    .then(() => process.exit(0))
    .catch(err => {
        logger.error(err);
        process.exit(1);
    });