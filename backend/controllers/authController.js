const authService = require('../services/authService');
const { AppError } = require('../middleware/errorHandler');

const authController = {
    register: async (req, res, next) => {
        try {
            const { login, email, password, phone } = req.body;

            if (!login || typeof login !== 'string' || login.trim().length < 3) {
                throw new AppError('Логин обязателен и должен содержать минимум 3 символа', 400, 'VALIDATION_ERROR');
            }

            if (!email || typeof email !== 'string' || !email.includes('@')) {
                throw new AppError('Некорректный email', 400, 'VALIDATION_ERROR');
            }

            if (!password || typeof password !== 'string' || password.length < 8) {
                throw new AppError('Пароль обязателен и должен содержать минимум 8 символов', 400, 'VALIDATION_ERROR');
            }

            const result = await authService.register(login, email, password, phone);

            res.status(201).json({
                success: true,
                message: 'Регистрация успешна',
                data: result
            });

        } catch (error) {
            next(error);
        }
    },

    login: async (req, res, next) => {
        try {
            const { login, password } = req.body;

            if (!login || !password) {
                throw new AppError('Логин и пароль обязательны', 400, 'VALIDATION_ERROR');
            }

            const result = await authService.login(login, password);

            res.json({
                success: true,
                message: 'Вход выполнен успешно',
                data: result
            });

        } catch (error) {
            next(error);
        }
    },

    logout: async (req, res, next) => {
        try {
            const userId = req.user?.userId || req.body.userId;
            const result = await authService.logout(userId);

            res.json({
                success: true,
                message: result.message
            });

        } catch (error) {
            next(error);
        }
    },

    refresh: async (req, res, next) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                throw new AppError('Refresh token обязателен', 400, 'MISSING_TOKEN');
            }

            const result = await authService.refreshToken(refreshToken);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },
    getMe: async (req, res, next) => {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                throw new AppError('Не авторизован', 401, 'UNAUTHORIZED');
            }

            const { User, Role, UserStatistic } = require('../sequelize/models');

            const user = await User.findByPk(userId, {
                attributes: ['UserId', 'Login', 'Email', 'Phone', 'AvatarUrl', 'Rating', 'CanCreate', 'IsActive'],
                include: [
                    { model: Role, as: 'role', attributes: ['Name'] },
                    { model: UserStatistic, as: 'statistics', attributes: ['TotalGamesPlayed', 'TotalWins', 'AverageScore', 'TotalQuizzesCreated'] }
                ]
            });

            if (!user) {
                throw new AppError('Пользователь не найден', 404, 'USER_NOT_FOUND');
            }

            res.json({
                success: true,
                data: {
                    id: user.UserId,
                    login: user.Login,
                    email: user.Email,
                    phone: user.Phone,
                    avatarUrl: user.AvatarUrl || null,
                    rating: user.Rating,
                    role: user.role?.Name || 'player',
                    canCreate: user.CanCreate,
                    isActive: user.IsActive,
                    statistics: user.statistics || {}
                }
            });

        } catch (error) {
            next(error);
        }
    },

    googleAuth: async (req, res, next) => {
        try {
            const googleProfile = req.user;

            if (!googleProfile) {
                throw new AppError('Не удалось получить данные от Google', 400, 'GOOGLE_AUTH_FAILED');
            }

            const result = await authService.googleLogin({
                email: googleProfile.email,
                name: googleProfile.displayName,
                googleId: googleProfile.id
            });

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth/callback?token=${result.token}`);
        } catch (error) {
            next(error);
        }
    },

    googleCallback: async (req, res, next) => {
        try {
            const googleProfile = req.user;
            if (!googleProfile) {
                throw new AppError('Не удалось получить данные от Google', 400, 'GOOGLE_AUTH_FAILED');
            }

            const result = await authService.googleLogin({
                email: googleProfile.email,
                name: googleProfile.displayName,
                googleId: googleProfile.id
            });

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/auth/callback?token=${result.token}`);
        } catch (error) {
            next(error);
        }
    },
    updateMe: async (req, res, next) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AppError('Не авторизован', 401, 'UNAUTHORIZED');
            }

            const { login, email, phone } = req.body;
            const user = await authService.updateProfile(userId, { login, email, phone });

            res.status(200).json({
                success: true,
                message: 'Профиль обновлен',
                data: user
            });
        } catch (error) {
            next(error);
        }
    },
    uploadAvatar: async (req, res, next) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AppError('Не авторизован', 401, 'UNAUTHORIZED');
            }
            if (!req.file) {
                throw new AppError('Файл аватара не загружен', 400, 'FILE_REQUIRED');
            }
            if (!req.file.mimetype?.startsWith('image/')) {
                throw new AppError('Аватар должен быть изображением', 400, 'INVALID_FILE_TYPE');
            }

            const avatarUrl = `/uploads/images/${req.file.filename}`;
            const updated = await authService.updateProfile(userId, { avatarUrl });

            res.status(200).json({
                success: true,
                message: 'Аватар обновлен',
                data: updated
            });
        } catch (error) {
            next(error);
        }
    }

};

module.exports = authController;