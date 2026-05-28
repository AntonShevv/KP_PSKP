const { User, Role, Category, UserStatistic, Quiz, GameSession, SessionPlayer, Question, Answer, sequelize, Op } = require('../sequelize/models');
const { AppError } = require('../middleware/errorHandler');

class AdminService {
    isProtectedAdmin(user) {
        const protectedId = Number(process.env.PRIMARY_ADMIN_ID || 0);
        const protectedLogin = (process.env.PRIMARY_ADMIN_LOGIN || 'admin').toLowerCase();
        return (protectedId > 0 && Number(user.UserId) === protectedId) || String(user.Login || '').toLowerCase() === protectedLogin;
    }

    async getAllUsers(page = 1, limit = 20, search = '') {
        const offset = (page - 1) * limit;
        const where = {};

        if (search) {
            where[Op.or] = [
                { Login: { [Op.like]: `%${search}%` } },
                { Email: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await User.findAndCountAll({
            where,
            include: [{ model: Role, as: 'role', attributes: ['RoleId', 'Name'] }],
            attributes: ['UserId', 'Login', 'Email', 'Phone', 'IsActive', 'CanCreate', 'Rating', 'CreatedAt'],
            order: [['UserId', 'ASC']],
            limit,
            offset
        });

        return {
            users: rows.map((u) => ({
                ...u.toJSON(),
                IsPrimaryAdmin: this.isProtectedAdmin(u)
            })),
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        };
    }

    async getUserById(userId) {
        const user = await User.findByPk(userId, {
            include: [
                { model: Role, as: 'role', attributes: ['RoleId', 'Name'] },
                { model: UserStatistic, as: 'statistics' }
            ]
        });

        if (!user) {
            throw new AppError('Пользователь не найден', 404, 'USER_NOT_FOUND');
        }

        return user;
    }

    async toggleUserBlock(userId, adminId) {
        if (userId == adminId) {
            throw new AppError('Нельзя заблокировать самого себя', 400, 'CANNOT_BLOCK_SELF');
        }

        const user = await User.findByPk(userId);
        if (!user) {
            throw new AppError('Пользователь не найден', 404, 'USER_NOT_FOUND');
        }
        if (this.isProtectedAdmin(user)) {
            throw new AppError('Главного администратора нельзя блокировать', 403, 'PRIMARY_ADMIN_PROTECTED');
        }

        user.IsActive = !user.IsActive;
        await user.save();

        return {
            userId: user.UserId,
            isActive: user.IsActive,
            message: user.IsActive ? 'Пользователь разблокирован' : 'Пользователь заблокирован'
        };
    }

    async toggleCanCreate(userId, adminId) {
        if (userId == adminId) {
            throw new AppError('Нельзя изменить права у самого себя', 400, 'CANNOT_CHANGE_SELF');
        }

        const user = await User.findByPk(userId);
        if (!user) {
            throw new AppError('Пользователь не найден', 404, 'USER_NOT_FOUND');
        }
        if (this.isProtectedAdmin(user)) {
            throw new AppError('Нельзя изменять права главного администратора', 403, 'PRIMARY_ADMIN_PROTECTED');
        }

        user.CanCreate = !user.CanCreate;
        await user.save();

        return {
            userId: user.UserId,
            canCreate: user.CanCreate,
            message: user.CanCreate ? 'Право на создание викторин выдано' : 'Право на создание викторин отозвано'
        };
    }

    async changeUserRole(userId, roleName, adminId) {
        if (userId == adminId) {
            throw new AppError('Нельзя изменить роль у самого себя', 400, 'CANNOT_CHANGE_SELF');
        }

        const user = await User.findByPk(userId);
        if (!user) {
            throw new AppError('Пользователь не найден', 404, 'USER_NOT_FOUND');
        }
        if (this.isProtectedAdmin(user)) {
            throw new AppError('Нельзя менять роль главного администратора', 403, 'PRIMARY_ADMIN_PROTECTED');
        }

        const role = await Role.findOne({ where: { Name: roleName } });
        if (!role) {
            throw new AppError('Роль не найдена', 404, 'ROLE_NOT_FOUND');
        }

        user.RoleId = role.RoleId;
        await user.save();

        return {
            userId: user.UserId,
            role: role.Name,
            message: `Роль пользователя изменена на ${role.Name}`
        };
    }

    async getAllCategories() {
        const categories = await Category.findAll({
            order: [['CategoryId', 'ASC']]
        });
        return { categories };
    }

    async getCategoryById(categoryId) {
        const category = await Category.findByPk(categoryId);
        if (!category) {
            throw new AppError('Категория не найдена', 404, 'CATEGORY_NOT_FOUND');
        }
        return category;
    }

    async createCategory(name, description) {
        if (!name || name.trim().length < 2) {
            throw new AppError('Название категории обязательно и должно содержать минимум 2 символа', 400, 'VALIDATION_ERROR');
        }

        const existing = await Category.findOne({ where: { Name: name.trim() } });
        if (existing) {
            throw new AppError('Категория с таким названием уже существует', 409, 'CATEGORY_EXISTS');
        }

        const category = await Category.create({
            Name: name.trim(),
            Description: description || null
        });

        return { category, message: 'Категория успешно создана' };
    }

    async updateCategory(categoryId, name, description) {
        const category = await Category.findByPk(categoryId);
        if (!category) {
            throw new AppError('Категория не найдена', 404, 'CATEGORY_NOT_FOUND');
        }

        if (name && name.trim()) {
            const existing = await Category.findOne({
                where: { Name: name.trim(), CategoryId: { [Op.ne]: categoryId } }
            });
            if (existing) {
                throw new AppError('Категория с таким названием уже существует', 409, 'CATEGORY_EXISTS');
            }
            category.Name = name.trim();
        }

        if (description !== undefined) {
            category.Description = description;
        }

        await category.save();

        return { category, message: 'Категория успешно обновлена' };
    }

    async deleteCategory(categoryId) {
        const category = await Category.findByPk(categoryId);
        if (!category) {
            throw new AppError('Категория не найдена', 404, 'CATEGORY_NOT_FOUND');
        }

        const quizzesCount = await Quiz.count({ where: { CategoryId: categoryId } });
        if (quizzesCount > 0) {
            throw new AppError(`Нельзя удалить категорию: ${quizzesCount} викторин используют её`, 400, 'CATEGORY_IN_USE');
        }

        await category.destroy();

        return { message: 'Категория успешно удалена' };
    }

    async getSystemStats() {
        const [
            totalUsers,
            activeUsers,
            totalQuizzes,
            publishedQuizzes,
            totalGames,
            totalQuestions,
            totalAnswers
        ] = await Promise.all([
            User.count(),
            User.count({ where: { IsActive: true } }),
            Quiz.count(),
            Quiz.count({ where: { IsPublished: true } }),
            GameSession.count(),
            Question.count(),
            Answer.count()
        ]);

        const topCategoriesRaw = await sequelize.query(
            `SELECT 
                c.CategoryId, 
                c.Name, 
                COUNT(q.QuizId) as count
            FROM Categories c
            LEFT JOIN Quizzes q ON c.CategoryId = q.CategoryId
            GROUP BY c.CategoryId, c.Name
            ORDER BY count DESC
            OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY`,
            { type: sequelize.QueryTypes.SELECT }
        );

        const topCategories = topCategoriesRaw.map(c => ({
            name: c.Name || 'Без категории',
            count: parseInt(c.count)
        }));

        const topUsers = await User.findAll({
            attributes: ['UserId', 'Login'],
            include: [
                {
                    model: UserStatistic,
                    as: 'statistics',
                    attributes: ['AverageScore']
                }
            ],
            order: [[{ model: UserStatistic, as: 'statistics' }, 'AverageScore', 'DESC']],
            limit: 10,
            subQuery: false
        });

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const last7DaysRaw = await sequelize.query(
            `SELECT 
                CAST(GameSessions.CreatedAt AS DATE) as date,
                COUNT(GameSessions.SessionId) as count
            FROM GameSessions
            WHERE GameSessions.CreatedAt >= :sevenDaysAgo
            GROUP BY CAST(GameSessions.CreatedAt AS DATE)
            ORDER BY CAST(GameSessions.CreatedAt AS DATE) ASC`,
            {
                replacements: { sevenDaysAgo: sevenDaysAgo.toISOString() },
                type: sequelize.QueryTypes.SELECT
            }
        );

        const dailyActivity = last7DaysRaw.map(d => ({
            date: d.date,
            games: parseInt(d.count)
        }));

        return {
            users: {
                total: totalUsers,
                active: activeUsers,
                blocked: totalUsers - activeUsers
            },
            quizzes: {
                total: totalQuizzes,
                published: publishedQuizzes,
                draft: totalQuizzes - publishedQuizzes
            },
            games: {
                total: totalGames
            },
            content: {
                questions: totalQuestions,
                answers: totalAnswers
            },
            topCategories,
            topUsers: topUsers.map(u => ({
                id: u.UserId,
                login: u.Login,
                averageScore: Math.round(u.statistics?.AverageScore || 0)
            })),
            dailyActivity
        };
    }

    async getUserStatistics(userId) {
        const user = await User.findByPk(userId, {
            include: [
                { model: Role, as: 'role' },
                { model: UserStatistic, as: 'statistics' }
            ]
        });

        if (!user) {
            throw new AppError('Пользователь не найден', 404, 'USER_NOT_FOUND');
        }

        const quizzesCreated = await Quiz.count({ where: { UserId: userId } });
        const gamesPlayed = await SessionPlayer.count({ where: { UserId: userId } });

        return {
            id: user.UserId,
            login: user.Login,
            email: user.Email,
            phone: user.Phone,
            role: user.role?.Name,
            isActive: user.IsActive,
            canCreate: user.CanCreate,
            rating: user.Rating,
            createdAt: user.CreatedAt,
            statistics: user.statistics || {
                TotalGamesPlayed: gamesPlayed,
                TotalWins: 0,
                AverageScore: 0,
                TotalQuizzesCreated: quizzesCreated
            },
            quizzesCreated,
            gamesPlayed
        };
    }
}

module.exports = new AdminService();