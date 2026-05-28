const adminService = require('../services/adminService');
const { AppError } = require('../middleware/errorHandler');

const adminController = {
    getAllUsers: async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const search = req.query.search || '';

            const result = await adminService.getAllUsers(page, limit, search);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getUserById: async (req, res, next) => {
        try {
            const userId = req.params.id;
            const user = await adminService.getUserById(userId);

            res.status(200).json({
                success: true,
                data: user
            });
        } catch (error) {
            next(error);
        }
    },

    toggleUserBlock: async (req, res, next) => {
        try {
            const userId = req.params.id;
            const adminId = req.user.userId;

            const result = await adminService.toggleUserBlock(userId, adminId);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    toggleCanCreate: async (req, res, next) => {
        try {
            const userId = req.params.id;
            const adminId = req.user.userId;

            const result = await adminService.toggleCanCreate(userId, adminId);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    changeUserRole: async (req, res, next) => {
        try {
            const userId = req.params.id;
            const { roleName } = req.body;
            const adminId = req.user.userId;

            if (!roleName) {
                throw new AppError('Укажите название роли', 400, 'ROLE_NAME_REQUIRED');
            }

            const result = await adminService.changeUserRole(userId, roleName, adminId);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getAllCategories: async (req, res, next) => {
        try {
            const result = await adminService.getAllCategories();

            res.status(200).json({
                success: true,
                data: result.categories
            });
        } catch (error) {
            next(error);
        }
    },

    getCategoryById: async (req, res, next) => {
        try {
            const categoryId = req.params.id;
            const category = await adminService.getCategoryById(categoryId);

            res.status(200).json({
                success: true,
                data: category
            });
        } catch (error) {
            next(error);
        }
    },

    createCategory: async (req, res, next) => {
        try {
            const { name, description } = req.body;
            const result = await adminService.createCategory(name, description);

            res.status(201).json({
                success: true,
                message: result.message,
                data: result.category
            });
        } catch (error) {
            next(error);
        }
    },

    updateCategory: async (req, res, next) => {
        try {
            const categoryId = req.params.id;
            const { name, description } = req.body;
            const result = await adminService.updateCategory(categoryId, name, description);

            res.status(200).json({
                success: true,
                message: result.message,
                data: result.category
            });
        } catch (error) {
            next(error);
        }
    },

    deleteCategory: async (req, res, next) => {
        try {
            const categoryId = req.params.id;
            const result = await adminService.deleteCategory(categoryId);

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    },

    getSystemStats: async (req, res, next) => {
        try {
            const stats = await adminService.getSystemStats();

            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    },

    getUserStatistics: async (req, res, next) => {
        try {
            const userId = req.params.id;
            const stats = await adminService.getUserStatistics(userId);

            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = adminController;