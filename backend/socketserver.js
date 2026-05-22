const socketIo = require('socket.io');
const roomService = require('./services/roomService');
const gameService = require('./services/gameService');
const { SessionPlayer, GameSession, Quiz, PlayerAnswer } = require('./sequelize/models');

const pausedSessions = new Set();

function initSocket(server) {
    io = socketIo(server, {
        cors: {
            origin: [
                "http://localhost:3000",
                "http://localhost:20000",
                "https://localhost:20443"
            ],
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        const safeAck = (cb, payload) => {
            if (typeof cb === 'function') {
                cb(payload);
            }
        };

        socket.on('create-room', async (data, callback) => {
            try {
                const { quizId, userId } = data;
                if (!quizId || !userId) throw new Error('quizId и userId обязательны');

                const parsedQuizId = parseInt(quizId);
                const parsedUserId = parseInt(userId);

                const existingSession = await GameSession.findOne({
                    where: {
                        QuizId: parsedQuizId,
                        HostId: parsedUserId,
                        Status: 'waiting'
                    },
                    include: [{ model: Quiz, as: 'quiz' }]
                });

                let room;
                if (existingSession) {
                    const players = await roomService.getRoomPlayers(existingSession.SessionId);
                    room = {
                        sessionId: existingSession.SessionId,
                        joinCode: existingSession.JoinCode,
                        players: players,
                        quiz: { title: existingSession.quiz?.Title || 'Quiz' }
                    };
                } else {
                    room = await roomService.createRoom(parsedQuizId, parsedUserId);
                }

                if (socket.data.sessionId && socket.data.sessionId !== room.sessionId) {
                    socket.leave(`room-${socket.data.sessionId}`);
                }

                socket.join(`room-${room.sessionId}`);
                socket.data.sessionId = room.sessionId;
                socket.data.userId = parsedUserId;

                const currentPlayers = await roomService.getRoomPlayers(room.sessionId);
                room.players = currentPlayers;

                safeAck(callback, { success: true, data: room });
            } catch (error) {
                console.error('Create room error:', error);
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('get-room-status', async (data, callback) => {
            try {
                const { sessionId } = data;
                const session = await GameSession.findByPk(sessionId);
                if (!session) {
                    throw new Error('Комната не найдена');
                }
                safeAck(callback, { success: true, data: { status: session.Status } });
            } catch (error) {
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('close-room', async (data, callback) => {
            try {
                const { sessionId, userId } = data;
                const finalUserId = userId || socket.data.userId;

                if (!sessionId) throw new Error('sessionId обязателен');
                if (!finalUserId) throw new Error('userId не найден');

                const session = await GameSession.findOne({
                    where: { SessionId: sessionId, HostId: finalUserId }
                });

                if (!session) {
                    throw new Error('Вы не являетесь хостом этой комнаты');
                }

                await SessionPlayer.destroy({
                    where: { SessionId: sessionId }
                });

                await session.destroy();

                io.to(`room-${sessionId}`).emit('room-closed', {
                    message: 'Комната закрыта хостом'
                });

                const roomSockets = await io.in(`room-${sessionId}`).fetchSockets();
                for (const sock of roomSockets) {
                    sock.leave(`room-${sessionId}`);
                    if (sock.data.sessionId === sessionId) {
                        sock.data.sessionId = null;
                    }
                }

                safeAck(callback, {
                    success: true,
                    data: { message: 'Комната успешно закрыта' }
                });
            } catch (error) {
                console.error('Close room error:', error.message);
                safeAck(callback, { success: false, error: error.message });
            }
        });
        socket.on('reset-room-status', async (data, callback) => {
            try {
                const { sessionId, userId } = data;
                const session = await GameSession.findOne({
                    where: { SessionId: sessionId, HostId: userId }
                });
                if (!session) {
                    throw new Error('Комната не найдена или вы не являетесь хостом');
                }
                session.Status = 'waiting';
                session.StartedAt = null;
                session.EndedAt = null;
                await session.save();
                safeAck(callback, { success: true, data: { status: 'waiting' } });
            } catch (error) {
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('join-room', async (data, callback) => {
            try {
                const { joinCode, userId } = data;
                if (!joinCode || !userId) throw new Error('joinCode и userId обязательны');
                const room = await roomService.joinRoom(joinCode, userId);
                socket.join(`room-${room.sessionId}`);
                socket.data.sessionId = room.sessionId;
                socket.data.userId = userId;
                const players = await roomService.getRoomPlayers(room.sessionId);
                io.to(`room-${room.sessionId}`).emit('players-update', { players });
                safeAck(callback, { success: true, data: room });
            } catch (error) {
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('get-players', async (data, callback) => {
            try {
                const { sessionId } = data;
                const players = await roomService.getRoomPlayers(sessionId);
                safeAck(callback, { success: true, data: { players } });
            } catch (error) {
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('start-game', async (data, callback) => {
            try {
                const { sessionId, userId } = data;

                if (!sessionId) throw new Error('sessionId обязателен');
                if (!userId) throw new Error('userId обязателен');

                const result = await roomService.startGame(sessionId, userId);
                const questions = await gameService.getQuestions(sessionId);
                pausedSessions.delete(Number(sessionId));

                const session = await GameSession.findByPk(sessionId);
                if (session) {
                    session.CurrentQuestionIndex = 0;
                    session.QuestionStartedAt = new Date();
                    await session.save();
                }

                io.to(`room-${sessionId}`).emit('game-started', {
                    questions,
                    currentQuestionIndex: 0
                });

                if (questions.length > 0) {
                    io.to(`room-${sessionId}`).emit('prepare-question', {
                        questionIndex: 0,
                        prepareDuration: 3
                    });

                    setTimeout(() => {
                        io.to(`room-${sessionId}`).emit('question-next', { questionIndex: 0 });
                    }, 3000);
                }

                safeAck(callback, { success: true, data: result });
            } catch (error) {
                console.error('Start game error:', error.message);
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('submit-answer', async (data, callback) => {
            try {
                const { sessionId, questionId, answerId, answerText, responseTimeMs } = data;
                const userId = socket.data.userId;
                if (!sessionId || !questionId) {
                    throw new Error('sessionId и questionId обязательны');
                }

                if (!userId) {
                    throw new Error('userId не найден в сокете');
                }

                const session = await GameSession.findByPk(sessionId);
                if (!session) {
                    throw new Error('Сессия не найдена');
                }

                if (session.Status !== 'active') {
                    throw new Error('Игра не активна');
                }

                const questions = await gameService.getQuestions(sessionId);
                const currentQuestionFromDb = questions[session.CurrentQuestionIndex];

                if (!currentQuestionFromDb || currentQuestionFromDb.id !== questionId) {
                    throw new Error('Этот вопрос уже не актуален');
                }

                const sessionPlayer = await SessionPlayer.findOne({
                    where: { SessionId: sessionId, UserId: userId }
                });

                if (!sessionPlayer) throw new Error('Игрок не найден');

                const existingAnswer = await PlayerAnswer.findOne({
                    where: {
                        SessionPlayerId: sessionPlayer.SessionPlayerId,
                        QuestionId: questionId
                    }
                });

                if (existingAnswer) {
                    safeAck(callback, {
                        success: false,
                        error: 'Вы уже ответили на этот вопрос'
                    });
                    return;
                }

                const question = await gameService.getQuestionById(questionId);
                const timeLimitMs = (question.TimeLimit || 30) * 1000;

                if (responseTimeMs > timeLimitMs) {
                    safeAck(callback, {
                        success: false,
                        error: 'Время на ответ истекло'
                    });
                    return;
                }

                let finalAnswerId = answerId;
                let finalAnswerText = answerText || '';

                if (question.Type === 'text') {
                    finalAnswerId = null;
                } else if (question.Type === 'multiple') {
                    finalAnswerId = null;
                }

                const result = await gameService.submitAnswer(
                    sessionId,
                    sessionPlayer.SessionPlayerId,
                    questionId,
                    finalAnswerId,
                    finalAnswerText,
                    responseTimeMs || 1000
                );

                const leaderboard = await gameService.getLeaderboard(sessionId);
                const questionStats = await gameService.getQuestionStats(sessionId, questionId);

                io.to(`room-${sessionId}`).emit('leaderboard-update', { leaderboard });
                io.to(`room-${sessionId}`).emit('question-stats', questionStats);

                safeAck(callback, { success: true, data: result });
            } catch (error) {
                console.error('Submit answer error:', error.message);
                safeAck(callback, { success: false, error: error.message });
            }
        });
        socket.on('has-answered', async (data, callback) => {
            try {
                const { sessionId, questionId } = data;
                const userId = socket.data.userId;

                if (!sessionId || !questionId || !userId) {
                    throw new Error('Missing parameters');
                }

                const sessionPlayer = await SessionPlayer.findOne({
                    where: { SessionId: sessionId, UserId: userId }
                });

                if (!sessionPlayer) {
                    safeAck(callback, { success: true, data: { answered: false } });
                    return;
                }

                const existingAnswer = await PlayerAnswer.findOne({
                    where: {
                        SessionPlayerId: sessionPlayer.SessionPlayerId,
                        QuestionId: questionId
                    }
                });

                safeAck(callback, {
                    success: true,
                    data: { answered: !!existingAnswer }
                });
            } catch (error) {
                safeAck(callback, { success: false, error: error.message });
            }
        });
        socket.on('next-question', async (data, callback) => {
            try {
                const { sessionId, questionIndex } = data;
                if (!sessionId) throw new Error('sessionId обязателен');

                const session = await GameSession.findByPk(sessionId);
                if (session) {
                    session.CurrentQuestionIndex = questionIndex;
                    session.QuestionStartedAt = new Date();
                    await session.save();
                }

                io.to(`room-${sessionId}`).emit('question-next', { questionIndex });
                safeAck(callback, { success: true });
            } catch (error) {
                console.error('Next question error:', error.message);
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('pause-timer', async (data, callback) => {
            try {
                const { sessionId } = data;
                if (!sessionId) throw new Error('sessionId обязателен');
                pausedSessions.add(Number(sessionId));
                io.to(`room-${sessionId}`).emit('timer-paused', { sessionId: Number(sessionId) });
                safeAck(callback, { success: true, data: { paused: true } });
            } catch (error) {
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('resume-timer', async (data, callback) => {
            try {
                const { sessionId } = data;
                if (!sessionId) throw new Error('sessionId обязателен');
                pausedSessions.delete(Number(sessionId));
                io.to(`room-${sessionId}`).emit('timer-resumed', { sessionId: Number(sessionId) });
                safeAck(callback, { success: true, data: { paused: false } });
            } catch (error) {
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('get-question-stats', async (data, callback) => {
            try {
                const { sessionId, questionId } = data;
                if (!sessionId || !questionId) throw new Error('sessionId и questionId обязательны');
                const questionStats = await gameService.getQuestionStats(sessionId, questionId);
                safeAck(callback, { success: true, data: questionStats });
            } catch (error) {
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('prepare-question', async (data, callback) => {
            try {
                const { sessionId, questionIndex, prepareDuration } = data;
                if (!sessionId) throw new Error('sessionId обязателен');
                io.to(`room-${sessionId}`).emit('prepare-question', {
                    questionIndex,
                    prepareDuration: prepareDuration || 3
                });

                safeAck(callback, { success: true });
            } catch (error) {
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('end-game', async (data, callback) => {
            try {
                const { sessionId, userId } = data;
                const finalUserId = userId || socket.data.userId;
                if (!sessionId) throw new Error('sessionId обязателен');
                if (!finalUserId) throw new Error('userId не найден');

                const result = await roomService.endGame(sessionId, finalUserId);
                pausedSessions.delete(Number(sessionId));
                io.to(`room-${sessionId}`).emit('game-ended', { players: result.players });
                safeAck(callback, { success: true, data: result });
            } catch (error) {
                console.error('End game error:', error.message);
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('get-game-state', async (data, callback) => {
            try {
                const { sessionId } = data;
                const session = await GameSession.findByPk(sessionId);
                if (!session) {
                    throw new Error('Сессия не найдена');
                }

                const questions = await gameService.getQuestions(sessionId);
                const currentQuestionIndex = session.CurrentQuestionIndex || 0;
                const currentQuestion = questions[currentQuestionIndex];

                let timeLeft = currentQuestion?.timeLimit || 30;

                if (session.QuestionStartedAt && session.Status === 'active') {
                    const elapsedSeconds = (Date.now() - new Date(session.QuestionStartedAt).getTime()) / 1000;
                    timeLeft = Math.max(0, Math.floor(timeLeft - elapsedSeconds));
                }

                safeAck(callback, {
                    success: true,
                    data: {
                        status: session.Status,
                        currentQuestionIndex: currentQuestionIndex,
                        timeLeft: timeLeft,
                        isTimerPaused: pausedSessions.has(Number(sessionId))
                    }
                });
            } catch (error) {
                console.error('Get game state error:', error.message);
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('get-leaderboard', async (data, callback) => {
            try {
                const { sessionId } = data;
                const leaderboard = await gameService.getLeaderboard(sessionId);
                safeAck(callback, { success: true, data: leaderboard });
            } catch (error) {
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('rejoin-room', async (data, callback) => {
            try {
                const { sessionId } = data;
                if (sessionId && socket.data.sessionId !== sessionId) {
                    if (socket.data.sessionId) {
                        socket.leave(`room-${socket.data.sessionId}`);
                    }
                    socket.join(`room-${sessionId}`);
                    socket.data.sessionId = sessionId;
                    const players = await roomService.getRoomPlayers(sessionId);
                    io.to(`room-${sessionId}`).emit('players-update', { players });

                    const session = await GameSession.findByPk(sessionId);
                    if (session && session.Status === 'active') {
                        const questions = await gameService.getQuestions(sessionId);
                        const currentQuestion = questions[session.CurrentQuestionIndex];
                        if (currentQuestion) {
                            socket.emit('question-next', { questionIndex: session.CurrentQuestionIndex });
                        }
                        const leaderboard = await gameService.getLeaderboard(sessionId);
                        socket.emit('leaderboard-update', { leaderboard });
                    }
                }
                safeAck(callback, { success: true });
            } catch (error) {
                console.error('Rejoin room error:', error.message);
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('reconnect-user', async (data, callback) => {
            try {
                const { userId } = data;
                if (userId) {
                    socket.data.userId = userId;
                    if (socket.data.sessionId) {
                        const session = await GameSession.findByPk(socket.data.sessionId);
                        if (session && session.Status === 'active') {
                            const questions = await gameService.getQuestions(socket.data.sessionId);
                            const currentQuestion = questions[session.CurrentQuestionIndex];
                            if (currentQuestion) {
                                socket.emit('question-next', { questionIndex: session.CurrentQuestionIndex });
                                const questionStats = await gameService.getQuestionStats(socket.data.sessionId, currentQuestion.id);
                                socket.emit('question-stats', questionStats);
                            }
                            const leaderboard = await gameService.getLeaderboard(socket.data.sessionId);
                            socket.emit('leaderboard-update', { leaderboard });
                            if (pausedSessions.has(Number(socket.data.sessionId))) {
                                socket.emit('timer-paused', { sessionId: Number(socket.data.sessionId) });
                            }
                        }
                    }
                }
                safeAck(callback, { success: true });
            } catch (error) {
                console.error('Reconnect user error:', error.message);
                safeAck(callback, { success: false, error: error.message });
            }
        });

        socket.on('get-questions', async (data, callback) => {
            try {
                const { sessionId } = data;
                if (!sessionId) {
                    throw new Error('sessionId обязателен');
                }
                const questions = await gameService.getQuestions(sessionId);
                safeAck(callback, {
                    success: true,
                    data: questions
                });
            } catch (error) {
                console.error('Get questions error:', error.message);
                safeAck(callback, {
                    success: false,
                    error: error.message
                });
            }
        });

        socket.on('disconnect', () => {
            console.log('Клиент отключен:', socket.id);
        });
    });

    return io;
}

module.exports = { initSocket, getIo: () => io };