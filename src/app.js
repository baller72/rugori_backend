const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middlewares/errorHandler');
const { globalLimiter } = require('./middlewares/rateLimiter');
const { UPLOAD_PATH, FRONTEND_URL } = require('./config/env');
const logger = require('./utils/logger');

// Initialisation de l'application Express
const app = express();

// Middlewares de sécurité
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:"],
        },
    },
}));

// Configuration CORS
app.use(cors({
    origin: FRONTEND_URL || "*",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parsing du body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Limiteur de requêtes global
app.use(globalLimiter);

// Logging des requêtes
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent')?.substring(0, 100)
        });
    });
    
    next();
});

// Servir les fichiers statiques uploadés
app.use('/uploads', express.static(path.join(__dirname, '..', UPLOAD_PATH)));

// Routes API
app.use(routes);

// Gestion des routes non trouvées
app.use(notFound);

// Gestionnaire d'erreurs global
app.use(errorHandler);

module.exports = app;