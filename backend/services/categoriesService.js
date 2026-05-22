const { Category, Op } = require('../sequelize/models');
const { AppError } = require('../middleware/errorHandler');

class CategoriesService {
    async getAll() {
        const categories = await Category.findAll({
            order: [['CategoryId', 'ASC']]
        });

        return { categories };
    }

    async getById(categoryId) {
        if (!categoryId) {
            throw new AppError('ID категории обязателен', 400, 'VALIDATION_ERROR');
        }

        const category = await Category.findByPk(categoryId);

        if (!category) {
            throw new AppError('Категория не найдена', 404, 'CATEGORY_NOT_FOUND');
        }

        return { category };
    }

    async add(name, description) {
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            throw new AppError('Название категории обязательно и должно содержать минимум 2 символа', 400, 'VALIDATION_ERROR');
        }

        const existingCategory = await Category.findOne({
            where: { Name: name.trim() }
        });

        if (existingCategory) {
            throw new AppError('Категория с таким названием уже существует', 409, 'CATEGORY_EXISTS');
        }

        const newCategory = await Category.create({
            Name: name.trim(),
            Description: description || null
        });

        return {
            category: newCategory,
            message: 'Категория успешно создана'
        };
    }

    async update(categoryId, name, description) {
        if (!categoryId) {
            throw new AppError('ID категории обязателен', 400, 'VALIDATION_ERROR');
        }

        const category = await Category.findByPk(categoryId);

        if (!category) {
            throw new AppError('Категория не найдена', 404, 'CATEGORY_NOT_FOUND');
        }

        if (name && name.trim()) {
            const existingCategory = await Category.findOne({
                where: {
                    Name: name.trim(),
                    CategoryId: { [Op.ne]: categoryId }
                }
            });

            if (existingCategory) {
                throw new AppError('Категория с таким названием уже существует', 409, 'CATEGORY_EXISTS');
            }
            category.Name = name.trim();
        }

        if (description !== undefined) {
            category.Description = description;
        }

        await category.save();

        return {
            category,
            message: 'Категория успешно обновлена'
        };
    }

    async delete(categoryId) {
        if (!categoryId) {
            throw new AppError('ID категории обязателен', 400, 'VALIDATION_ERROR');
        }

        const category = await Category.findByPk(categoryId);

        if (!category) {
            throw new AppError('Категория не найдена', 404, 'CATEGORY_NOT_FOUND');
        }

        await category.destroy();

        return {
            message: 'Категория успешно удалена'
        };
    }
}

module.exports = new CategoriesService();