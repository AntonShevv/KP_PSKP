const { Question, Answer, PlayerAnswer, SessionPlayer, GameSession, Quiz, User } = require('../sequelize/models');
const { AppError } = require('../middleware/errorHandler');

class GameService {
    async getQuestions(sessionId) {
        const session = await GameSession.findByPk(sessionId, {
            include: [{ model: Quiz, as: 'quiz' }]
        });

        if (!session) {
            throw new AppError('Сессия не найдена', 404, 'SESSION_NOT_FOUND');
        }

        const questions = await Question.findAll({
            where: { QuizId: session.QuizId },
            include: [{ model: Answer, as: 'answers' }],
            order: [['OrderNum', 'ASC']]
        });

        return questions.map(q => ({
            id: q.QuestionId,
            text: q.Text,
            type: q.Type,
            points: q.Points,
            timeLimit: q.TimeLimit || session.quiz.DefaultQuestionTime || 30,
            mediaUrl: q.MediaUrl || null,
            mediaType: q.MediaType || null,
            answers: q.answers.map(a => ({
                id: a.AnswerId,
                text: a.Text,
                mediaUrl: a.MediaUrl || null,
                mediaType: a.MediaType || null
            }))
        }));
    }

    async getQuestionById(questionId) {
        const question = await Question.findByPk(questionId, {
            include: [{ model: Answer, as: 'answers' }]
        });
        if (!question) {
            throw new AppError('Вопрос не найден', 404);
        }
        return question;
    }

    async submitAnswer(sessionId, sessionPlayerId, questionId, answerId, answerText = '', responseTimeMs) {
        const session = await GameSession.findByPk(sessionId);
        if (!session || session.Status !== 'active') {
            throw new AppError('Игра не активна', 400);
        }

        const question = await Question.findByPk(questionId, {
            include: [{ model: Answer, as: 'answers' }]
        });
        if (!question) {
            throw new AppError('Вопрос не найден', 404);
        }

        const timeLimitMs = (question.TimeLimit || 30) * 1000;
        if (responseTimeMs > timeLimitMs) {
            return {
                isCorrect: false,
                pointsEarned: 0,
                message: 'Время вышло!'
            };
        }

        const existingAnswer = await PlayerAnswer.findOne({
            where: { SessionPlayerId: sessionPlayerId, QuestionId: questionId }
        });
        if (existingAnswer) {
            throw new AppError('Ответ на этот вопрос уже отправлен', 400);
        }

        let isCorrect = false;
        let pointsEarned = 0;
        let finalAnswerId = answerId;
        let finalAnswerText = null;

        if (question.Type === 'single') {
            const selectedAnswer = await Answer.findByPk(answerId);
            if (selectedAnswer) {
                isCorrect = selectedAnswer.IsCorrect;
                finalAnswerId = answerId;
                if (isCorrect) {
                    const speedBonus = Math.max(0, Math.floor((timeLimitMs - responseTimeMs) / 100));
                    pointsEarned = question.Points + speedBonus;
                }
            }
        }
        else if (question.Type === 'multiple') {
            try {
                const selectedAnswerIds = JSON.parse(answerText);
                const correctAnswerIds = question.answers
                    .filter(a => a.IsCorrect)
                    .map(a => a.AnswerId);

                const sortedSelected = [...selectedAnswerIds].sort((a, b) => a - b);
                const sortedCorrect = [...correctAnswerIds].sort((a, b) => a - b);

                isCorrect = sortedSelected.length === sortedCorrect.length &&
                    sortedSelected.every((id, idx) => id === sortedCorrect[idx]);

                finalAnswerId = null;
                finalAnswerText = answerText;

                if (isCorrect) {
                    const speedBonus = Math.max(0, Math.floor((timeLimitMs - responseTimeMs) / 100));
                    pointsEarned = question.Points + speedBonus;
                }
            } catch (e) {
                console.error('Error parsing multiple answer:', e);
                isCorrect = false;
            }
        }
        else if (question.Type === 'text') {
            const expectedAnswer = question.answers.find(a => a.IsCorrect);
            if (expectedAnswer) {
                const normalizedUserAnswer = answerText.trim().toLowerCase().replace(/\s+/g, ' ');
                const normalizedExpectedAnswer = expectedAnswer.Text.trim().toLowerCase().replace(/\s+/g, ' ');
                isCorrect = normalizedUserAnswer === normalizedExpectedAnswer;
                finalAnswerId = null;
                finalAnswerText = answerText;

                if (isCorrect) {
                    const speedBonus = Math.max(0, Math.floor((timeLimitMs - responseTimeMs) / 100));
                    pointsEarned = question.Points + speedBonus;
                }
            }
        }

        await PlayerAnswer.create({
            SessionPlayerId: sessionPlayerId,
            QuestionId: questionId,
            AnswerId: finalAnswerId === 0 ? null : finalAnswerId,
            AnswerText: finalAnswerText,
            ResponseTimeMs: responseTimeMs,
            IsCorrect: isCorrect,
            PointsEarned: pointsEarned
        });

        const sessionPlayer = await SessionPlayer.findByPk(sessionPlayerId);
        if (sessionPlayer) {
            sessionPlayer.Score += pointsEarned;
            if (isCorrect) {
                sessionPlayer.CorrectAnswers += 1;
            }
            await sessionPlayer.save();
        }

        return {
            isCorrect,
            pointsEarned,
            message: isCorrect ? 'Правильно!' : 'Неправильно!',
            correctAnswers: question.answers
                .filter((a) => a.IsCorrect)
                .map((a) => ({ id: a.AnswerId, text: a.Text }))
        };
    }
    async getLeaderboard(sessionId) {
        const players = await SessionPlayer.findAll({
            where: { SessionId: sessionId },
            include: [{ model: User, as: 'user', attributes: ['UserId', 'Login'] }],
            order: [['Score', 'DESC']]
        });

        return players.map((p, index) => ({
            rank: index + 1,
            userId: p.user.UserId,
            login: p.user.Login,
            score: p.Score,
            correctAnswers: p.CorrectAnswers
        }));
    }

    async getQuestionStats(sessionId, questionId) {
        const [totalPlayers, answers, answerOptions, question] = await Promise.all([
            SessionPlayer.count({ where: { SessionId: sessionId } }),
            PlayerAnswer.findAll({
                where: { QuestionId: questionId },
                include: [{ model: SessionPlayer, as: 'player', attributes: ['SessionId'] }]
            }),
            Answer.findAll({
                where: { QuestionId: questionId },
                attributes: ['AnswerId', 'Text', 'IsCorrect']
            }),
            Question.findByPk(questionId, { attributes: ['Type'] })
        ]);

        const validAnswers = answers.filter((entry) => entry.player?.SessionId === sessionId);
        const answeredPlayerIds = new Set(validAnswers.map((entry) => entry.SessionPlayerId));
        const correctPlayerIds = new Set(
            validAnswers.filter((entry) => entry.IsCorrect).map((entry) => entry.SessionPlayerId)
        );

        const answeredCount = answeredPlayerIds.size;
        const correctCount = correctPlayerIds.size;

        let perAnswerCounts = [];

        if (question.Type === 'text') {
            const textAnswers = validAnswers.map((answer) => ({
                answerId: answer.PlayerAnswerId,
                answerText: answer.AnswerText || 'Нет ответа',
                count: 1,
                percentage: Math.round((1 / answeredCount) * 100)
            }));

            perAnswerCounts = textAnswers;
        }
        else if (question.Type === 'multiple') {
            perAnswerCounts = await Promise.all(answerOptions.map(async (option) => {
                let count = 0;
                for (const answer of validAnswers) {
                    if (answer.AnswerText && answer.AnswerText.startsWith('[')) {
                        try {
                            const selectedIds = JSON.parse(answer.AnswerText);
                            if (selectedIds.includes(option.AnswerId)) {
                                count++;
                            }
                        } catch (e) {
                            console.error('Error parsing answer text:', e);
                        }
                    }
                }
                const percentage = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
                return {
                    answerId: option.AnswerId,
                    answerText: option.Text,
                    count,
                    percentage
                };
            }));
        }
        else {
            perAnswerCounts = answerOptions.map((option) => {
                const count = validAnswers.filter((entry) => entry.AnswerId === option.AnswerId).length;
                const percentage = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
                return {
                    answerId: option.AnswerId,
                    answerText: option.Text,
                    count,
                    percentage
                };
            });
        }

        return {
            questionId,
            totalPlayers,
            answeredCount,
            correctCount,
            answeredPercentage: totalPlayers > 0 ? Math.round((answeredCount / totalPlayers) * 100) : 0,
            correctPercentage: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0,
            allAnswered: totalPlayers > 0 && answeredCount >= totalPlayers,
            answers: perAnswerCounts,
            questionType: question.Type
        };
    }
}

module.exports = new GameService();