const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOAD_PATH, MAX_FILE_SIZE } = require('../config/env');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// Création des répertoires d'upload
const createUploadDirs = () => {
    const dirs = [
        path.join(UPLOAD_PATH, 'payment-proofs'),
        path.join(UPLOAD_PATH, 'products'),
        path.join(UPLOAD_PATH, 'qrcodes'),
        path.join(UPLOAD_PATH, 'temp')
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

createUploadDirs();

// Configuration du stockage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = path.join(UPLOAD_PATH, 'temp');

        if (file.fieldname === 'payment_proof') {
            uploadPath = path.join(UPLOAD_PATH, 'payment-proofs');
        } else if (file.fieldname === 'product_image') {
            uploadPath = path.join(UPLOAD_PATH, 'products');
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

// Filtre des fichiers
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Type de fichier non autorisé. Utilisez JPEG, PNG ou PDF.', 400), false);
    }
};

// Configuration Multer
const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter
});

// Middlewares spécifiques
const uploadPaymentProof = upload.single('payment_proof');
const uploadProductImage = upload.single('product_image');
const uploadMultipleProductImages = upload.array('product_images', 5);

// Middleware de gestion d'erreur Multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError('Fichier trop volumineux. Maximum 5MB.', 400));
        }
        return next(new AppError(`Erreur d'upload: ${err.message}`, 400));
    }
    next(err);
};

module.exports = {
    uploadPaymentProof,
    uploadProductImage,
    uploadMultipleProductImages,
    handleMulterError
};