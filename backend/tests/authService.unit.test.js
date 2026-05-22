const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError } = require('../middleware/errorHandler');

jest.mock('../sequelize/models', () => ({
    User: {
        findOne: jest.fn(),
        create: jest.fn(),
        findByPk: jest.fn(),
        update: jest.fn(),
    },
    Role: {
        findOne: jest.fn(),
    },
    UserStatistic: {
        create: jest.fn(),
        findOne: jest.fn(),
    },
    Op: {
        or: Symbol('or'),
        ne: Symbol('ne'),
    },
}));

jest.mock('bcryptjs', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
    verify: jest.fn(),
}));

const authService = require('../services/authService');
const { User, Role, UserStatistic } = require('../sequelize/models');

describe('AuthService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });


    test('register() - успешная регистрация нового пользователя', async () => {
        const testData = {
            login: 'newuser',
            email: 'newuser@example.com',
            password: 'password123',
            phone: '+375291234567'
        };
        
        const mockUser = {
            UserId: 1,
            Login: testData.login,
            Email: testData.email,
            CanCreate: true,
            AvatarUrl: null
        };
        
        const mockRole = { RoleId: 2, Name: 'player' };
        
        User.findOne.mockResolvedValueOnce(null);
        Role.findOne.mockResolvedValueOnce(mockRole);
        bcrypt.hash.mockResolvedValueOnce('hashed_password_123');
        User.create.mockResolvedValueOnce(mockUser);
        UserStatistic.create.mockResolvedValueOnce({});
        jwt.sign.mockReturnValue('mock_jwt_token_123');

        const result = await authService.register(
            testData.login, 
            testData.email, 
            testData.password, 
            testData.phone
        );

        expect(result).toBeDefined();
        expect(result.token).toBe('mock_jwt_token_123');
        expect(result.user.login).toBe(testData.login);
        expect(User.findOne).toHaveBeenCalledTimes(1);
        expect(User.create).toHaveBeenCalledTimes(1);
        expect(bcrypt.hash).toHaveBeenCalledWith(testData.password, 10);
    });

    test('register() - ошибка при регистрации с существующим логином', async () => {
        const existingUser = {
            UserId: 1,
            Login: 'existinguser',
            Email: 'existing@example.com'
        };
        
        User.findOne.mockResolvedValueOnce(existingUser);

        await expect(authService.register(
            'existinguser', 
            'new@example.com', 
            'password123'
        )).rejects.toThrow('Пользователь с таким логином или email уже существует');
        
        expect(User.create).not.toHaveBeenCalled();
    });


    test('register() - короткий логин (менее 3 символов)', async () => {
        const shortLogin = 'ab';
        const mockRole = { RoleId: 2, Name: 'player' };
        const mockUser = {
            UserId: 1,
            Login: shortLogin,
            Email: 'test@example.com',
            CanCreate: true
        };
        
        User.findOne.mockResolvedValueOnce(null);
        Role.findOne.mockResolvedValueOnce(mockRole);
        bcrypt.hash.mockResolvedValueOnce('hashed');
        User.create.mockResolvedValueOnce(mockUser);
        UserStatistic.create.mockResolvedValueOnce({});
        jwt.sign.mockReturnValue('token');

        const result = await authService.register(shortLogin, 'test@example.com', 'password123');

        expect(result).toBeDefined();
        expect(result.user.login).toBe(shortLogin);
        expect(User.create).toHaveBeenCalled();
    });


    test('register() - некорректный email', async () => {
        const invalidEmail = 'invalid-email';
        const mockRole = { RoleId: 2, Name: 'player' };
        const mockUser = {
            UserId: 1,
            Login: 'validuser',
            Email: invalidEmail,
            CanCreate: true
        };
        
        User.findOne.mockResolvedValueOnce(null);
        Role.findOne.mockResolvedValueOnce(mockRole);
        bcrypt.hash.mockResolvedValueOnce('hashed');
        User.create.mockResolvedValueOnce(mockUser);
        UserStatistic.create.mockResolvedValueOnce({});
        jwt.sign.mockReturnValue('token');

        const result = await authService.register('validuser', invalidEmail, 'password123');

        expect(result).toBeDefined();
        expect(result.user.email).toBe(invalidEmail);
        expect(User.create).toHaveBeenCalled();
    });

    test('register() - короткий пароль', async () => {
        const shortPassword = '1234567';
        const mockRole = { RoleId: 2, Name: 'player' };
        const mockUser = {
            UserId: 1,
            Login: 'validuser',
            Email: 'valid@example.com',
            CanCreate: true
        };
        
        User.findOne.mockResolvedValueOnce(null);
        Role.findOne.mockResolvedValueOnce(mockRole);
        bcrypt.hash.mockResolvedValueOnce('hashed_short');
        User.create.mockResolvedValueOnce(mockUser);
        UserStatistic.create.mockResolvedValueOnce({});
        jwt.sign.mockReturnValue('token');

        const result = await authService.register('validuser', 'valid@example.com', shortPassword);

        expect(result).toBeDefined();
        expect(bcrypt.hash).toHaveBeenCalledWith(shortPassword, 10);
        expect(User.create).toHaveBeenCalled();
    });

    test('login() - успешный вход по логину', async () => {
        const mockUser = {
            UserId: 1,
            Login: 'testuser',
            Email: 'test@example.com',
            PasswordHash: 'hashed_password',
            IsActive: true,
            CanCreate: true,
            Rating: 150,
            role: { Name: 'player' }
        };
        
        User.findOne.mockResolvedValueOnce(mockUser);
        bcrypt.compare.mockResolvedValueOnce(true);
        jwt.sign.mockReturnValue('mock_auth_token');

        const result = await authService.login('testuser', 'correct_password');

        expect(result).toBeDefined();
        expect(result.token).toBe('mock_auth_token');
        expect(result.user.login).toBe('testuser');
        expect(bcrypt.compare).toHaveBeenCalledWith('correct_password', 'hashed_password');
    });


    test('login() - успешный вход по email', async () => {
        const mockUser = {
            UserId: 1,
            Login: 'testuser',
            Email: 'test@example.com',
            PasswordHash: 'hashed_password',
            IsActive: true,
            role: { Name: 'player' }
        };
        
        User.findOne.mockResolvedValueOnce(mockUser);
        bcrypt.compare.mockResolvedValueOnce(true);
        jwt.sign.mockReturnValue('mock_token');

        const result = await authService.login('test@example.com', 'password123');

        expect(result.user.email).toBe('test@example.com');
    });

    test('login() - ошибка при неверном пароле', async () => {
        const mockUser = {
            UserId: 1,
            Login: 'testuser',
            PasswordHash: 'hashed_password',
            IsActive: true
        };
        
        User.findOne.mockResolvedValueOnce(mockUser);
        bcrypt.compare.mockResolvedValueOnce(false);

        await expect(authService.login('testuser', 'wrong_password'))
            .rejects.toThrow('Неверный логин или пароль');
    });

    test('login() - ошибка при входе заблокированного пользователя', async () => {
        const blockedUser = {
            UserId: 1,
            Login: 'blockeduser',
            PasswordHash: 'hash',
            IsActive: false
        };
        
        User.findOne.mockResolvedValueOnce(blockedUser);

        await expect(authService.login('blockeduser', 'password123'))
            .rejects.toThrow('Ваш аккаунт заблокирован');
    });

    test('login() - ошибка при входе несуществующего пользователя', async () => {
        User.findOne.mockResolvedValueOnce(null);

        await expect(authService.login('nonexistent', 'password123'))
            .rejects.toThrow('Неверный логин или пароль');
    });

    test('updateProfile() - успешное обновление данных профиля', async () => {
        const mockUser = {
            UserId: 1,
            Login: 'oldlogin',
            Email: 'old@example.com',
            Phone: '+375291234567',
            CanCreate: true,
            save: jest.fn().mockResolvedValue(true),
            role: { Name: 'player' }
        };
        
        User.findByPk.mockResolvedValueOnce(mockUser);
        User.findOne.mockResolvedValueOnce(null);

        const result = await authService.updateProfile(1, {
            login: 'newlogin',
            email: 'new@example.com',
            phone: '+375295555555'
        });

        expect(result.login).toBe('newlogin');
        expect(result.email).toBe('new@example.com');
        expect(mockUser.save).toHaveBeenCalled();
    });

    test('updateProfile() - ошибка при занятом логине', async () => {
        const mockUser = { UserId: 1, Login: 'oldlogin', Email: 'old@example.com' };
        const existingUser = { UserId: 2, Login: 'taken' };
        
        User.findByPk.mockResolvedValueOnce(mockUser);
        User.findOne.mockResolvedValueOnce(existingUser);

        await expect(authService.updateProfile(1, { login: 'taken' }))
            .rejects.toThrow('Логин или email уже заняты');
    });

    test('updateProfile() - ошибка при обновлении несуществующего пользователя', async () => {
        User.findByPk.mockResolvedValueOnce(null);

        await expect(authService.updateProfile(999, { login: 'newlogin' }))
            .rejects.toThrow('Пользователь не найден');
    });

    test('refreshToken() - успешное обновление токена', async () => {
        const mockUser = {
            UserId: 1,
            Login: 'testuser',
            IsActive: true,
            role: { Name: 'player' }
        };
        
        jwt.verify.mockReturnValue({ userId: 1 });
        User.findByPk.mockResolvedValueOnce(mockUser);
        jwt.sign.mockReturnValue('new_refreshed_token');

        const result = await authService.refreshToken('valid_refresh_token');

        expect(result).toHaveProperty('token', 'new_refreshed_token');
        expect(jwt.verify).toHaveBeenCalled();
    });


    test('refreshToken() - ошибка при отсутствии refresh токена', async () => {
        await expect(authService.refreshToken(''))
            .rejects.toThrow('Refresh token обязателен');
    });

    test('generateToken() - корректная генерация JWT токена', async () => {
        const mockUser = {
            UserId: 1,
            Login: 'testuser',
            CanCreate: true
        };
        const mockRole = { Name: 'admin' };
        
        jwt.sign.mockReturnValue('generated_jwt_token');

        const token = authService.generateToken(mockUser, mockRole);

        expect(token).toBe('generated_jwt_token');
        expect(jwt.sign).toHaveBeenCalledWith(
            {
                userId: 1,
                login: 'testuser',
                role: 'admin',
                canCreate: true
            },
            expect.any(String),
            { expiresIn: '7d' }
        );
    });
});