const { GameSession, SessionPlayer, Quiz, User, UserStatistic } = require('../sequelize/models');
const { AppError } = require('../middleware/errorHandler');

class RoomService {
    generateJoinCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return code;
    }
    async updateCurrentQuestionIndex(sessionId, questionIndex) {
        const session = await GameSession.findByPk(sessionId);
        if (!session) {
            throw new AppError('Сессия не найдена', 404);
        }
        session.CurrentQuestionIndex = questionIndex;
        await session.save();
        return session;
    }
    async createRoom(quizId, userId) {
        const parsedQuizId = parseInt(quizId);
        const parsedUserId = parseInt(userId);

        const existingSession = await GameSession.findOne({
            where: {
                QuizId: parsedQuizId,
                HostId: parsedUserId,
                Status: 'waiting'
            }
        });

        if (existingSession) {
            const players = await this.getRoomPlayers(existingSession.SessionId);
            return {
                sessionId: existingSession.SessionId,
                joinCode: existingSession.JoinCode,
                players: players,
                quiz: { title: existingSession.quiz?.Title }
            };
        }

        const joinCode = this.generateJoinCode();
        const session = await GameSession.create({
            QuizId: parsedQuizId,
            HostId: parsedUserId,
            JoinCode: joinCode,
            Status: 'waiting',
            CurrentQuestionIndex: 0,
            CreatedAt: new Date()
        });

        return {
            sessionId: session.SessionId,
            joinCode: joinCode,
            players: [],
            quiz: { title: session.quiz?.Title }
        };
    }

    async getRoomByQuizAndHost(quizId, userId) {
        const session = await GameSession.findOne({
            where: {
                QuizId: quizId,
                HostId: userId,
                Status: 'waiting'
            },
            include: [{ model: Quiz, as: 'quiz' }]
        });

        if (session) {
            const players = await this.getRoomPlayers(session.SessionId);
            return {
                sessionId: session.SessionId,
                joinCode: session.JoinCode,
                players: players,
                quiz: { title: session.quiz.Title }
            };
        }
        return null;
    }
    async joinRoom(joinCode, userId) {
        const session = await GameSession.findOne({
            where: { JoinCode: joinCode, Status: 'waiting' },
            include: [{ model: Quiz, as: 'quiz' }]
        });

        if (!session) {
            throw new AppError('Комната не найдена или игра уже началась', 404, 'ROOM_NOT_FOUND');
        }

        const existingPlayer = await SessionPlayer.findOne({
            where: { SessionId: session.SessionId, UserId: userId }
        });

        if (!existingPlayer) {
            await SessionPlayer.create({
                SessionId: session.SessionId,
                UserId: userId,
                Score: 0,
                CorrectAnswers: 0
            });
        }

        const players = await SessionPlayer.findAll({
            where: { SessionId: session.SessionId },
            include: [{ model: User, as: 'user', attributes: ['UserId', 'Login', 'Rating'] }]
        });

        return {
            sessionId: session.SessionId,
            quiz: session.quiz,
            players: players.map(p => ({
                userId: p.user.UserId,
                login: p.user.Login,
                score: p.Score
            }))
        };
    }

    async getRoomPlayers(sessionId) {
        const players = await SessionPlayer.findAll({
            where: { SessionId: sessionId },
            include: [{ model: User, as: 'user', attributes: ['UserId', 'Login', 'Rating'] }],
            order: [['Score', 'DESC']]
        });

        return players.map(p => ({
            userId: p.user.UserId,
            login: p.user.Login,
            score: p.Score,
            correctAnswers: p.CorrectAnswers
        }));
    }

    async startGame(sessionId, hostId) {
        const session = await GameSession.findOne({
            where: { SessionId: sessionId, HostId: hostId }
        });

        if (!session) {
            throw new AppError('Комната не найдена или вы не являетесь хостом', 404, 'ROOM_NOT_FOUND');
        }

        if (session.Status !== 'waiting') {
            throw new AppError('Игра уже началась или завершена', 400, 'GAME_ALREADY_STARTED');
        }

        session.Status = 'active';
        session.StartedAt = new Date();
        await session.save();

        return { sessionId, status: 'active' };
    }

    async endGame(sessionId, hostId) {
        const session = await GameSession.findOne({
            where: { SessionId: sessionId, HostId: hostId }
        });

        if (!session) {
            throw new AppError('Комната не найдена', 404, 'ROOM_NOT_FOUND');
        }

        session.Status = 'finished';
        session.EndedAt = new Date();
        await session.save();

        const players = await this.getRoomPlayers(sessionId);
        await this.updateUserStatistics(players);

        return { sessionId, status: 'finished', players };
    }

    async updateUserStatistics(players) {
        if (!players || players.length === 0) return;
        const winnerUserId = players[0]?.userId;

        for (const player of players) {
            let stats = await UserStatistic.findOne({ where: { UserId: player.userId } });
            if (!stats) {
                stats = await UserStatistic.create({ UserId: player.userId });
            }

            const previousGames = stats.TotalGamesPlayed || 0;
            const previousAverage = stats.AverageScore || 0;
            const newTotalGames = previousGames + 1;
            const newAverage = ((previousAverage * previousGames) + (player.score || 0)) / newTotalGames;

            stats.TotalGamesPlayed = newTotalGames;
            stats.AverageScore = newAverage;

            if (player.userId === winnerUserId) {
                stats.TotalWins = (stats.TotalWins || 0) + 1;
            }

            await stats.save();
        }
    }
}

module.exports = new RoomService();