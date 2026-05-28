const jwt = require('jsonwebtoken');
const { User, Role } = require('../sequelize/models');
const { AppError } = require('./errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Требуется авторизация. Укажите Bearer token', 401, 'MISSING_TOKEN');
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findByPk(decoded.userId, {
            attributes: ['UserId', 'Login', 'CanCreate', 'IsActive'],
            include: [{ model: Role, as: 'role', attributes: ['Name'] }]
        });

        if (!user) {
            throw new AppError('Пользователь не найден', 401, 'USER_NOT_FOUND');
        }

        if (!user.IsActive) {
            throw new AppError('Аккаунт заблокирован', 403, 'ACCOUNT_BLOCKED');
        }

        req.user = {
            userId: user.UserId,
            login: user.Login,
            role: user.role?.Name || 'player',
            canCreate: user.CanCreate
        };

        next();
    } catch (error) {
        next(error);
    }
};

const isAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError('Не авторизован', 401, 'UNAUTHORIZED');
        }
        
        if (req.user.role !== 'admin') {
            throw new AppError('Доступ запрещен. Требуется роль администратора', 403, 'FORBIDDEN');
        }
        
        next();
    } catch (error) {
        next(error);
    }
};

const canCreate = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError('Не авторизован', 401, 'UNAUTHORIZED');
        }
        
        if (!req.user.canCreate && req.user.role !== 'admin') {
            throw new AppError('Доступ запрещен. Нет права на создание викторин', 403, 'FORBIDDEN');
        }
        
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    authenticate,
    isAdmin,
    canCreate
};