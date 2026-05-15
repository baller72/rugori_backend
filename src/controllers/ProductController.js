const Product = require('../models/Product');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Contrôleur de produits
 */
class ProductController {
    /**
     * Liste des produits (public)
     */
    static getProducts = asyncHandler(async (req, res) => {
        const filters = {
            category_id: req.query.category_id,
            is_featured: req.query.featured === 'true',
            is_kit: req.query.is_kit,
            min_price: req.query.min_price,
            max_price: req.query.max_price,
            search: req.query.search,
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0
        };

        const products = await Product.findAll(filters);
        // const total = await Product.count(filters);
        const total = products.length;

        res.status(200).json({
            status: 'success',
            results: products.length,
            total,
            data: { products }
        });
    });

    /**
     * Détail d'un produit (public)
     */
    static getProduct = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const product = await Product.findById(id);

        if (!product) {
            throw new AppError('Produit non trouvé', 404);
        }

        res.status(200).json({
            status: 'success',
            data: { product }
        });
    });

    /**
     * Création d'un produit (admin)
     */
    static createProduct = asyncHandler(async (req, res) => {
        const productData = req.body;

        // Validation SKU unique
        if (productData.sku) {
            const existing = await Product.findBySku(productData.sku);
            if (existing) {
                throw new AppError('Ce SKU existe déjà', 400);
            }
        }

        const product = await Product.create(productData);

        res.status(201).json({
            status: 'success',
            data: { product }
        });
    });

    /**
     * Mise à jour d'un produit (admin)
     */
    static updateProduct = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updateData = req.body;

        // Vérification existence
        const existing = await Product.findById(id);
        if (!existing) {
            throw new AppError('Produit non trouvé', 404);
        }

        // Validation SKU unique si modifié
        if (updateData.sku && updateData.sku !== existing.sku) {
            const skuExists = await Product.findBySku(updateData.sku);
            if (skuExists) {
                throw new AppError('Ce SKU existe déjà', 400);
            }
        }

        await Product.update(id, updateData);

        const updatedProduct = await Product.findById(id);

        res.status(200).json({
            status: 'success',
            data: { product: updatedProduct }
        });
    });

    /**
     * Suppression d'un produit (admin)
     */
    static deleteProduct = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const deleted = await Product.delete(id);

        if (!deleted) {
            throw new AppError('Produit non trouvé', 404);
        }

        res.status(200).json({
            status: 'success',
            data: { message: 'Produit supprimé' }
        });
    });

    /**
     * Liste des catégories (public)
     */
    static getCategories = asyncHandler(async (req, res) => {
        const categories = await Category.findAll();

        res.status(200).json({
            status: 'success',
            results: categories.length,
            data: { categories }
        });
    });

    /**
     * Création d'une catégorie (admin)
     */
    static createCategory = asyncHandler(async (req, res) => {
        const category = await Category.create(req.body);

        res.status(201).json({
            status: 'success',
            data: { category }
        });
    });

    /**
     * Mise à jour d'une catégorie (admin)
     */
    static updateCategory = asyncHandler(async (req, res) => {
        const { id } = req.params;

        await Category.update(id, req.body);

        const updatedCategory = await Category.findById(id);

        res.status(200).json({
            status: 'success',
            data: { category: updatedCategory }
        });
    });

    /**
     * Suppression d'une catégorie (admin)
     */
    static deleteCategory = asyncHandler(async (req, res) => {
        const { id } = req.params;

        await Category.delete(id);

        res.status(200).json({
            status: 'success',
            data: { message: 'Catégorie supprimée' }
        });
    });

    /**
     * Produits en rupture de stock (admin)
     */
    static getLowStockProducts = asyncHandler(async (req, res) => {
        const threshold = parseInt(req.query.threshold) || 5;
        const products = await Product.findLowStock(threshold);

        res.status(200).json({
            status: 'success',
            results: products.length,
            data: { products }
        });
    });

    /**
     * Statistiques des produits (admin)
     */
    static getProductStats = asyncHandler(async (req, res) => {
        const stats = await Product.getStats();

        res.status(200).json({
            status: 'success',
            data: { stats }
        });
    });
}

module.exports = ProductController;