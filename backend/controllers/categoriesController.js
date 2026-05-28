const categoriesService = require('../services/categoriesService');
const { AppError } = require('../middleware/errorHandler');

const categoriesController = {
    getAll: async (req, res, next) => {
        try {
            const result = await categoriesService.getAll();

            res.status(200).json({
                success: true,
                data: result.categories
            });

        } catch (error) {
            next(error);
        }
    },

    getById: async (req, res, next) => {
        try {
            const categoryId = req.params.id;
            const result = await categoriesService.getById(categoryId);

            res.status(200).json({
                success: true,
                data: result.category
            });
        } catch (error) {
            next(error);
        }
    },

    add: async (req, res, next) => {
        try {
            const { name, description } = req.body;

            if (!name || typeof name !== 'string' || name.trim().length < 2) {
                throw new AppError('Название категории обязательно и должно содержать минимум 2 символа', 400, 'VALIDATION_ERROR');
            }

            const result = await categoriesService.add(name, description);

            res.status(201).json({
                success: true,
                message: result.message,
                data: result.category
            });

        } catch (error) {
            next(error);
        }
    },

    update: async (req, res, next) => {
        try {
            const categoryId = req.params.id;
            const { name, description } = req.body;

            if (!categoryId) {
                throw new AppError('ID категории обязателен', 400, 'VALIDATION_ERROR');
            }

            const result = await categoriesService.update(categoryId, name, description);

            res.status(200).json({
                success: true,
                message: result.message,
                data: result.category
            });

        } catch (error) {
            next(error);
        }
    },

    delete: async (req, res, next) => {
        try {
            const categoryId = req.params.id;

            if (!categoryId) {
                throw new AppError('ID категории обязателен', 400, 'VALIDATION_ERROR');
            }

            const result = await categoriesService.delete(categoryId);

            res.status(200).json({
                success: true,
                message: result.message
            });

        } catch (error) {
            next(error);
        }
    }
};

module.exports = categoriesController;