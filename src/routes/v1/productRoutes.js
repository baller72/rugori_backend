const router = require('express').Router();
const ProductController = require('../../controllers/ProductController');
const { authenticate, restrictTo } = require('../../middlewares/auth');
const { uploadProductImage, uploadMultipleProductImages, handleMulterError } = require('../../middlewares/upload');

// Routes publiques
router.get('/', ProductController.getProducts);
router.get('/categories', ProductController.getCategories);
router.get('/:id', ProductController.getProduct);

// Routes admin
router.use(authenticate, restrictTo('admin'));

router.post(
    '/',
    uploadProductImage,
    handleMulterError,
    ProductController.createProduct
);

router.patch(
    '/:id',
    uploadProductImage,
    handleMulterError,
    ProductController.updateProduct
);

router.delete('/:id', ProductController.deleteProduct);

router.post('/categories', ProductController.createCategory);
router.patch('/categories/:id', ProductController.updateCategory);
router.delete('/categories/:id', ProductController.deleteCategory);

router.get('/inventory/low-stock', ProductController.getLowStockProducts);
router.get('/stats/summary', ProductController.getProductStats);

module.exports = router;