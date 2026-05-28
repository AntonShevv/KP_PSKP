const { Question, Quiz, Answer, Op } = require('../sequelize/models');
const { AppError } = require('../middleware/errorHandler');

class QuestionService {
    async getAll(quizId) {
        if (!quizId) {
            throw new AppError('ID викторины обязателен', 400, 'VALIDATION_ERROR');
        }

        const questions = await Question.findAll({
            where: { QuizId: quizId },
            include: [{ model: Answer, as: 'answers' }],
            order: [['OrderNum', 'ASC']]
        });

        return { questions };
    }

    async getById(questionId) {
        if (!questionId) {
            throw new AppError('ID вопроса обязателен', 400, 'VALIDATION_ERROR');
        }

        const question = await Question.findByPk(questionId, {
            include: [{ model: Answer, as: 'answers' }]
        });

        if (!question) {
            throw new AppError('Вопрос не найден', 404, 'QUESTION_NOT_FOUND');
        }

        return { question };
    }

    async create(quizId, userId, text, type, points, timeLimit, orderNum, mediaUrl = null, mediaType = null) {
        if (!quizId) {
            throw new AppError('ID викторины обязателен', 400, 'VALIDATION_ERROR');
        }

        const quiz = await Quiz.findByPk(quizId);

        if (!quiz) {
            throw new AppError('Викторина не найдена', 404, 'QUIZ_NOT_FOUND');
        }

        if (quiz.UserId !== userId) {
            throw new AppError('Вы не являетесь автором этой викторины', 403, 'FORBIDDEN');
        }

        if (!text || text.trim().length < 1) {
            throw new AppError('Текст вопроса обязателен', 400, 'VALIDATION_ERROR');
        }

        let finalOrderNum = orderNum;
        if (!finalOrderNum) {
            const lastQuestion = await Question.findOne({
                where: { QuizId: quizId },
                order: [['OrderNum', 'DESC']]
            });
            finalOrderNum = lastQuestion ? lastQuestion.OrderNum + 1 : 1;
        }

        const question = await Question.create({
            QuizId: quizId,
            Text: text.trim(),
            Type: type || 'single',
            Points: points || 100,
            TimeLimit: timeLimit || null,
            OrderNum: finalOrderNum,
            MediaUrl: mediaUrl,
            MediaType: mediaType
        });

        return {
            question,
            message: 'Вопрос успешно создан'
        };
    }

    async update(questionId, userId, text, type, points, timeLimit, orderNum, mediaUrl = null, mediaType = null) {
        if (!questionId) {
            throw new AppError('ID вопроса обязателен', 400, 'VALIDATION_ERROR');
        }

        const question = await Question.findByPk(questionId, {
            include: [{ model: Quiz, as: 'quiz' }]
        });

        if (!question) {
            throw new AppError('Вопрос не найден', 404, 'QUESTION_NOT_FOUND');
        }

        if (question.quiz.UserId !== userId) {
            throw new AppError('Вы не являетесь автором этой викторины', 403, 'FORBIDDEN');
        }

        if (text && text.trim()) {
            question.Text = text.trim();
        }

        if (type) {
            question.Type = type;
        }

        if (points) {
            question.Points = points;
        }

        if (timeLimit !== undefined) {
            question.TimeLimit = timeLimit;
        }

        if (orderNum !== undefined) {
            question.OrderNum = orderNum;
        }

        if (mediaUrl !== undefined) {
            question.MediaUrl = mediaUrl;
        }

        if (mediaType !== undefined) {
            question.MediaType = mediaType;
        }

        await question.save();

        return {
            question,
            message: 'Вопрос успешно обновлен'
        };
    }

    async delete(questionId, userId) {
        if (!questionId) {
            throw new AppError('ID вопроса обязателен', 400, 'VALIDATION_ERROR');
        }

        const question = await Question.findByPk(questionId, {
            include: [{ model: Quiz, as: 'quiz' }]
        });

        if (!question) {
            throw new AppError('Вопрос не найден', 404, 'QUESTION_NOT_FOUND');
        }

        if (question.quiz.UserId !== userId) {
            throw new AppError('Вы не являетесь автором этой викторины', 403, 'FORBIDDEN');
        }

        await question.destroy();

        return {
            message: 'Вопрос успешно удален'
        };
    }

    async reorder(quizId, userId, questionOrders) {
        if (!quizId) {
            throw new AppError('ID викторины обязателен', 400, 'VALIDATION_ERROR');
        }

        const quiz = await Quiz.findByPk(quizId);

        if (!quiz) {
            throw new AppError('Викторина не найдена', 404, 'QUIZ_NOT_FOUND');
        }

        if (quiz.UserId !== userId) {
            throw new AppError('Вы не являетесь автором этой викторины', 403, 'FORBIDDEN');
        }

        if (!Array.isArray(questionOrders)) {
            throw new AppError('Неверный формат данных', 400, 'VALIDATION_ERROR');
        }

        for (const item of questionOrders) {
            await Question.update(
                { OrderNum: item.order },
                { where: { QuestionId: item.id, QuizId: quizId } }
            );
        }

        return {
            message: 'Порядок вопросов успешно обновлен'
        };
    }
}

module.exports = new QuestionService();