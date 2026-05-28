const statisticsService = require('../services/statisticsService');
const { AppError } = require('../middleware/errorHandler');

const statisticsController = {
    getMyStats: async (req, res, next) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AppError('Не авторизован', 401, 'UNAUTHORIZED');
            }
            
            const stats = await statisticsService.getUserStats(userId);
            
            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            next(error);
        }
    },

    getMyGames: async (req, res, next) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new AppError('Не авторизован', 401, 'UNAUTHORIZED');
            }
            
            const games = await statisticsService.getUserGames(userId);
            
            res.status(200).json({
                success: true,
                data: games
            });
        } catch (error) {
            next(error);
        }
    },

    getLeaderboard: async (req, res, next) => {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const leaderboard = await statisticsService.getGlobalLeaderboard(limit);
            
            res.status(200).json({
                success: true,
                data: leaderboard
            });
        } catch (error) {
            next(error);
        }
    },

    getGameDetails: async (req, res, next) => {
        try {
            const userId = req.user?.userId;
            const sessionId = parseInt(req.params.sessionId);

            if (!userId) {
                throw new AppError('Не авторизован', 401, 'UNAUTHORIZED');
            }

            if (!sessionId) {
                throw new AppError('ID игры обязателен', 400, 'VALIDATION_ERROR');
            }

            const details = await statisticsService.getGameDetails(userId, sessionId);
            res.status(200).json({
                success: true,
                data: details
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = statisticsController;