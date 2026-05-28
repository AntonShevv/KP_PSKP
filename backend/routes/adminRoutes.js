const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, isAdmin);
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/block', adminController.toggleUserBlock);
router.patch('/users/:id/can-create', adminController.toggleCanCreate);
router.patch('/users/:id/role', adminController.changeUserRole);
router.get('/categories', adminController.getAllCategories);
router.get('/categories/:id', adminController.getCategoryById);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);
router.get('/stats', adminController.getSystemStats);
router.get('/users/:id/stats', adminController.getUserStatistics);

module.exports = router;