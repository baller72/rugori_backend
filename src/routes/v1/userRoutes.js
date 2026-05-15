const router = require('express').Router();
const UserController = require('../../controllers/UserController');
const { authenticate, restrictTo } = require('../../middlewares/auth');

// Toutes les routes nécessitent authentification
router.use(authenticate);

// Routes pour utilisateur connecté
router.patch('/profile', UserController.updateProfile);

// Routes admin uniquement
router.use(restrictTo('admin'));

router.get('/', UserController.getAllUsers);
router.post('/', UserController.createUser);
router.get('/livreurs', UserController.getLivreurs);
router.get('/stats', UserController.getUserStats);
router.get('/:id', UserController.getUserById);
router.patch('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

module.exports = router;