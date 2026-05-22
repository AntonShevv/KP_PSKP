class AppError extends Error {
    constructor(message, statusCode, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code || this.getCodeFromStatus(statusCode);
    }

    getCodeFromStatus(statusCode) {
        const codes = {
            400: 'BAD_REQUEST',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            409: 'CONFLICT',
            422: 'UNPROCESSABLE_ENTITY',
            429: 'TOO_MANY_REQUESTS',
            500: 'INTERNAL_SERVER_ERROR',
            503: 'SERVICE_UNAVAILABLE'
        };
        return codes[statusCode] || 'UNKNOWN_ERROR';
    }
}

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    
    const errorResponse = {
        error: {
            message: err.message || 'Внутренняя ошибка сервера',
            code: err.code || 'INTERNAL_SERVER_ERROR'
        }
    };

    res.status(statusCode).json(errorResponse);
};

const notFoundHandler = (req, res, next) => {
    next(new AppError(`Маршрут ${req.originalUrl} не найден`, 404, 'NOT_FOUND'));
};

const sequelizeErrorHandler = (err, req, res, next) => {
    if (err.name === 'SequelizeValidationError') {
        const messages = err.errors.map(e => e.message);
        const error = new AppError('Ошибка валидации данных', 400, 'VALIDATION_ERROR');
        error.details = messages;
        return next(error);
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        const fields = err.errors.map(e => e.path);
        const error = new AppError(`Поле ${fields.join(', ')} уже существует`, 409, 'DUPLICATE_ERROR');
        return next(error);
    }

    if (err.name === 'SequelizeForeignKeyConstraintError') {
        const error = new AppError('Связанная запись не найдена', 404, 'FOREIGN_KEY_ERROR');
        return next(error);
    }

    if (err.name === 'SequelizeConnectionError') {
        const error = new AppError('Ошибка подключения к базе данных', 503, 'DATABASE_CONNECTION_ERROR');
        return next(error);
    }

    next(err);
};

const jwtErrorHandler = (err, req, res, next) => {
    if (err.name === 'JsonWebTokenError') {
        return next(new AppError('Недействительный токен авторизации', 401, 'INVALID_TOKEN'));
    }

    if (err.name === 'TokenExpiredError') {
        return next(new AppError('Срок действия токена истек', 401, 'TOKEN_EXPIRED'));
    }

    next(err);
};

module.exports = {
    errorHandler,
    notFoundHandler,
    sequelizeErrorHandler,
    jwtErrorHandler,
    AppError
};