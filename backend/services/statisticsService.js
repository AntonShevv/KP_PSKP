const { UserStatistic, User, SessionPlayer, Quiz, Category, GameSession, PlayerAnswer, Question, Answer } = require('../sequelize/models');
const { AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

class StatisticsService {
    async getUserStats(userId) {
        if (!userId) {
            throw new AppError('ID пользователя обязателен', 400, 'VALIDATION_ERROR');
        }

        let stats = await UserStatistic.findOne({
            where: { UserId: userId },
            include: [{ model: Category, as: 'favoriteCategory', attributes: ['CategoryId', 'Name'] }]
        });

        if (!stats) {
            stats = await UserStatistic.create({
                UserId: userId,
                TotalGamesPlayed: 0,
                TotalWins: 0,
                AverageScore: 0,
                TotalQuizzesCreated: 0
            });
        }

        const quizzesCreated = await Quiz.count({ where: { UserId: userId } });
        
        if (stats.TotalQuizzesCreated !== quizzesCreated) {
            stats.TotalQuizzesCreated = quizzesCreated;
            await stats.save();
        }

        return stats;
    }

    async getUserGames(userId) {
        if (!userId) {
            throw new AppError('ID пользователя обязателен', 400, 'VALIDATION_ERROR');
        }

        const games = await SessionPlayer.findAll({
            where: { UserId: userId },
            include: [
                { 
                    model: GameSession, 
                    as: 'session',
                    include: [{ model: Quiz, as: 'quiz', attributes: ['QuizId', 'Title'] }]
                }
            ],
            order: [['JoinedAt', 'DESC']],
            limit: 50
        });

        return games.map(game => ({
            sessionId: game.SessionId,
            quizId: game.session?.quiz?.QuizId,
            quizTitle: game.session?.quiz?.Title || 'Unknown',
            score: game.Score,
            correctAnswers: game.CorrectAnswers,
            joinedAt: game.JoinedAt,
            status: game.session?.Status
        }));
    }

    async getGlobalLeaderboard(limit = 10) {
        const users = await User.findAll({
            where: { IsActive: true },
            include: [{ model: UserStatistic, as: 'statistics' }],
            order: [[{ model: UserStatistic, as: 'statistics' }, 'AverageScore', 'DESC']],
            limit: Math.min(limit, 100)
        });

        return users.map((user, index) => ({
            rank: index + 1,
            userId: user.UserId,
            login: user.Login,
            rating: user.Rating,
            totalGames: user.statistics?.TotalGamesPlayed || 0,
            averageScore: user.statistics?.AverageScore || 0,
            totalWins: user.statistics?.TotalWins || 0
        }));
    }

    async getGameDetails(userId, sessionId) {
        if (!userId || !sessionId) {
            throw new AppError('ID пользователя и сессии обязательны', 400, 'VALIDATION_ERROR');
        }

        const sessionPlayer = await SessionPlayer.findOne({
            where: { UserId: userId, SessionId: sessionId },
            include: [
                {
                    model: GameSession,
                    as: 'session',
                    include: [{ model: Quiz, as: 'quiz', attributes: ['QuizId', 'Title'] }]
                }
            ]
        });

        if (!sessionPlayer) {
            throw new AppError('Игра не найдена для пользователя', 404, 'GAME_NOT_FOUND');
        }

        const answers = await PlayerAnswer.findAll({
            where: { SessionPlayerId: sessionPlayer.SessionPlayerId },
            include: [
                { model: Question, as: 'question', attributes: ['QuestionId', 'Text', 'Points', 'Type'] },
                { model: Answer, as: 'answer', attributes: ['AnswerId', 'Text', 'IsCorrect'] }
            ],
            order: [['AnsweredAt', 'ASC']]
        });

        const formattedAnswers = await Promise.all(answers.map(async (entry) => {
            let selectedAnswerText = '';
            const question = entry.question;
            
            if (question?.Type === 'single') {
                if (entry.AnswerId && entry.answer) {
                    selectedAnswerText = entry.answer.Text;
                } else {
                    selectedAnswerText = 'Ответ не выбран';
                }
            } 
            else if (question?.Type === 'multiple') {
                if (entry.AnswerText && entry.AnswerText.startsWith('[')) {
                    try {
                        const selectedIds = JSON.parse(entry.AnswerText);
                        const answersList = await Answer.findAll({
                            where: { AnswerId: selectedIds },
                            attributes: ['Text']
                        });
                        selectedAnswerText = answersList.map(a => a.Text).join(', ');
                    } catch (e) {
                        selectedAnswerText = entry.AnswerText;
                    }
                } else if (entry.AnswerText) {
                    selectedAnswerText = entry.AnswerText;
                } else {
                    selectedAnswerText = 'Ответы не выбраны';
                }
            }
            else if (question?.Type === 'text') {
                selectedAnswerText = entry.AnswerText || 'Ответ не введён';
            }
            else {
                selectedAnswerText = entry.answer?.Text || entry.AnswerText || 'Нет данных';
            }

            return {
                playerAnswerId: entry.PlayerAnswerId,
                questionId: entry.QuestionId,
                questionText: entry.question?.Text || 'Unknown question',
                selectedAnswerId: entry.AnswerId,
                selectedAnswerText: selectedAnswerText,
                isCorrect: entry.IsCorrect,
                pointsEarned: entry.PointsEarned,
                responseTimeMs: entry.ResponseTimeMs,
                answeredAt: entry.AnsweredAt
            };
        }));

        return {
            sessionId: sessionPlayer.SessionId,
            quizTitle: sessionPlayer.session?.quiz?.Title || 'Unknown',
            score: sessionPlayer.Score,
            correctAnswers: sessionPlayer.CorrectAnswers,
            joinedAt: sessionPlayer.JoinedAt,
            answers: formattedAnswers
        };
    }
}

module.exports = new StatisticsService();