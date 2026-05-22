const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, UserStatistic, Op } = require('../sequelize/models');
const { AppError } = require('../middleware/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

class AuthService {
    async register(login, email, password, phone = null) {
        if (!login || !email || !password) {
            throw new AppError('Логин, email и пароль обязательны', 400, 'MISSING_FIELDS');
        }

        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ Login: login }, { Email: email }]
            }
        });

        if (existingUser) {
            throw new AppError('Пользователь с таким логином или email уже существует', 409, 'USER_EXISTS');
        }

        const playerRole = await Role.findOne({ where: { Name: 'player' } });

        if (!playerRole) {
            throw new AppError('Роль "player" не найдена в базе данных', 500, 'ROLE_NOT_FOUND');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            Login: login,
            Email: email,
            PasswordHash: hashedPassword,
            Phone: phone,
            RoleId: playerRole.RoleId,
            CanCreate: true,
            IsActive: true
        });

        await UserStatistic.create({
            UserId: user.UserId,
            TotalGamesPlayed: 0,
            TotalWins: 0,
            AverageScore: 0,
            TotalQuizzesCreated: 0
        });

        const token = this.generateToken(user, playerRole);

        return {
            user: {
                id: user.UserId,
                login: user.Login,
                email: user.Email,
                avatarUrl: user.AvatarUrl || null,
                role: playerRole.Name,
                canCreate: user.CanCreate
            },
            token
        };
    }

    async login(login, password) {
        if (!login || !password) {
            throw new AppError('Логин и пароль обязательны', 400, 'MISSING_CREDENTIALS');
        }

        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { Login: login },
                    { Email: login }
                ]
            },
            include: [
                { model: Role, as: 'role', attributes: ['Name'] }
            ]
        });

        if (!user) {
            throw new AppError('Неверный логин или пароль', 401, 'INVALID_CREDENTIALS');
        }

        if (!user.IsActive) {
            throw new AppError('Ваш аккаунт заблокирован. Обратитесь к администратору', 403, 'ACCOUNT_BLOCKED');
        }

        const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
        if (!isPasswordValid) {
            throw new AppError('Неверный логин или пароль', 401, 'INVALID_CREDENTIALS');
        }

        const token = this.generateToken(user, user.role);

        return {
            user: {
                id: user.UserId,
                login: user.Login,
                email: user.Email,
                phone: user.Phone,
                avatarUrl: user.AvatarUrl || null,
                role: user.role?.Name || 'player',
                canCreate: user.CanCreate,
                rating: user.Rating
            },
            token
        };
    }

    async googleLogin(googleProfile) {
        const { email, name, googleId } = googleProfile;

        if (!email) {
            throw new AppError('Email от Google не получен', 400, 'GOOGLE_EMAIL_REQUIRED');
        }

        let user = await User.findOne({
            where: { Email: email },
            include: [{ model: Role, as: 'role', attributes: ['Name'] }]
        });

        const playerRole = await Role.findOne({ where: { Name: 'player' } });
        if (!playerRole) {
            throw new AppError('Роль "player" не найдена в базе данных', 500, 'ROLE_NOT_FOUND');
        }

        if (!user) {
            let baseLogin = name ? name.toLowerCase().replace(/\s/g, '') : email.split('@')[0];
            let login = baseLogin;
            let counter = 1;

            while (await User.findOne({ where: { Login: login } })) {
                login = `${baseLogin}${counter}`;
                counter++;
            }

            user = await User.create({
                Login: login,
                Email: email,
                PasswordHash: '',
                Phone: null,
                RoleId: playerRole.RoleId,
                CanCreate: true,
                IsActive: true
            });

            await UserStatistic.create({
                UserId: user.UserId,
                TotalGamesPlayed: 0,
                TotalWins: 0,
                AverageScore: 0,
                TotalQuizzesCreated: 0
            });
        }

        if (!user.IsActive) {
            throw new AppError('Ваш аккаунт заблокирован. Обратитесь к администратору', 403, 'ACCOUNT_BLOCKED');
        }

        const token = this.generateToken(user, playerRole);

        return {
            user: {
                id: user.UserId,
                login: user.Login,
                email: user.Email,
                phone: user.Phone,
                avatarUrl: user.AvatarUrl || null,
                role: playerRole.Name,
                canCreate: user.CanCreate,
                rating: user.Rating
            },
            token
        };
    }

    async logout(userId) {
        return { success: true, message: 'Выход выполнен успешно' };
    }

    async refreshToken(refreshToken) {
        if (!refreshToken) {
            throw new AppError('Refresh token обязателен', 400, 'MISSING_TOKEN');
        }

        try {
            const decoded = jwt.verify(refreshToken, JWT_SECRET);
            const user = await User.findByPk(decoded.userId, {
                include: [{ model: Role, as: 'role', attributes: ['Name'] }]
            });

            if (!user) {
                throw new AppError('Пользователь не найден', 401, 'USER_NOT_FOUND');
            }

            if (!user.IsActive) {
                throw new AppError('Пользователь заблокирован', 403, 'ACCOUNT_BLOCKED');
            }

            const newToken = this.generateToken(user, user.role);
            return { token: newToken };
        } catch (error) {
            if (error instanceof AppError) throw error;
            if (error.name === 'JsonWebTokenError') {
                throw new AppError('Недействительный refresh токен', 401, 'INVALID_TOKEN');
            }
            if (error.name === 'TokenExpiredError') {
                throw new AppError('Refresh токен истек', 401, 'TOKEN_EXPIRED');
            }
            throw new AppError('Недействительный refresh токен', 401, 'INVALID_REFRESH_TOKEN');
        }
    }

    async updateProfile(userId, { login, email, phone, avatarUrl }) {
        if (!userId) {
            throw new AppError('Пользователь не найден', 404, 'USER_NOT_FOUND');
        }

        const user = await User.findByPk(userId, {
            include: [{ model: Role, as: 'role', attributes: ['Name'] }]
        });

        if (!user) {
            throw new AppError('Пользователь не найден', 404, 'USER_NOT_FOUND');
        }

        const nextLogin = typeof login === 'string' ? login.trim() : user.Login;
        const nextEmail = typeof email === 'string' ? email.trim() : user.Email;
        const nextPhone = typeof phone === 'string' ? phone.trim() : user.Phone;

        if (!nextLogin || nextLogin.length < 3) {
            throw new AppError('Логин должен содержать минимум 3 символа', 400, 'VALIDATION_ERROR');
        }
        if (!nextEmail || !nextEmail.includes('@')) {
            throw new AppError('Некорректный email', 400, 'VALIDATION_ERROR');
        }

        const duplicate = await User.findOne({
            where: {
                UserId: { [Op.ne]: userId },
                [Op.or]: [{ Login: nextLogin }, { Email: nextEmail }]
            }
        });
        if (duplicate) {
            throw new AppError('Логин или email уже заняты', 409, 'USER_EXISTS');
        }

        user.Login = nextLogin;
        user.Email = nextEmail;
        user.Phone = nextPhone || null;
        if (typeof avatarUrl === 'string') {
            user.AvatarUrl = avatarUrl || null;
        }
        await user.save();

        return {
            id: user.UserId,
            login: user.Login,
            email: user.Email,
            phone: user.Phone,
            avatarUrl: user.AvatarUrl || null,
            role: user.role?.Name || 'player',
            canCreate: user.CanCreate,
            rating: user.Rating
        };
    }

    generateToken(user, role = null) {
        return jwt.sign(
            {
                userId: user.UserId,
                login: user.Login,
                role: role ? role.Name : (user.role ? user.role.Name : 'player'),
                canCreate: user.CanCreate
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
    }
}

module.exports = new AuthService();