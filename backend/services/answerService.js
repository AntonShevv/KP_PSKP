const { Answer, Question, Quiz, Op } = require('../sequelize/models');
const { AppError } = require('../middleware/errorHandler');

class AnswerService {
    async getAll(questionId) {
        if (!questionId) {
            throw new AppError('ID вопроса обязателен', 400, 'VALIDATION_ERROR');
        }

        const answers = await Answer.findAll({
            where: { QuestionId: questionId },
            order: [['OrderNum', 'ASC']]
        });

        return { answers };
    }

    async getById(answerId) {
        if (!answerId) {
            throw new AppError('ID ответа обязателен', 400, 'VALIDATION_ERROR');
        }

        const answer = await Answer.findByPk(answerId);

        if (!answer) {
            throw new AppError('Ответ не найден', 404, 'ANSWER_NOT_FOUND');
        }

        return { answer };
    }

    async create(questionId, userId, text, isCorrect, orderNum, mediaUrl = null, mediaType = null) {
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

        if (!text || text.trim().length < 1) {
            throw new AppError('Текст ответа обязателен', 400, 'VALIDATION_ERROR');
        }

        let finalOrderNum = orderNum;
        if (!finalOrderNum) {
            const lastAnswer = await Answer.findOne({
                where: { QuestionId: questionId },
                order: [['OrderNum', 'DESC']]
            });
            finalOrderNum = lastAnswer ? lastAnswer.OrderNum + 1 : 1;
        }

        const answer = await Answer.create({
            QuestionId: questionId,
            Text: text.trim(),
            IsCorrect: isCorrect || false,
            OrderNum: finalOrderNum,
            MediaUrl: mediaUrl,
            MediaType: mediaType
        });

        if (question.Type === 'single' && isCorrect) {
            const otherCorrectAnswers = await Answer.findAll({
                where: { 
                    QuestionId: questionId, 
                    IsCorrect: true,
                    AnswerId: { [Op.ne]: answer.AnswerId }
                }
            });
            
            for (const other of otherCorrectAnswers) {
                other.IsCorrect = false;
                await other.save();
            }
        }

        return { 
            answer,
            message: 'Ответ успешно создан'
        };
    }

    async update(answerId, userId, text, isCorrect, orderNum, mediaUrl = null, mediaType = null) {
        if (!answerId) {
            throw new AppError('ID ответа обязателен', 400, 'VALIDATION_ERROR');
        }

        const answer = await Answer.findByPk(answerId, {
            include: [
                { 
                    model: Question, 
                    as: 'question',
                    include: [{ model: Quiz, as: 'quiz' }]
                }
            ]
        });

        if (!answer) {
            throw new AppError('Ответ не найден', 404, 'ANSWER_NOT_FOUND');
        }

        if (answer.question.quiz.UserId !== userId) {
            throw new AppError('Вы не являетесь автором этой викторины', 403, 'FORBIDDEN');
        }

        if (text && text.trim()) {
            answer.Text = text.trim();
        }

        if (isCorrect !== undefined) {
            answer.IsCorrect = isCorrect;

            if (answer.question.Type === 'single' && isCorrect) {
                const otherCorrectAnswers = await Answer.findAll({
                    where: { 
                        QuestionId: answer.QuestionId, 
                        IsCorrect: true,
                        AnswerId: { [Op.ne]: answerId }
                    }
                });
                
                for (const other of otherCorrectAnswers) {
                    other.IsCorrect = false;
                    await other.save();
                }
            }
        }

        if (orderNum !== undefined) {
            answer.OrderNum = orderNum;
        }

        if (mediaUrl !== undefined) {
            answer.MediaUrl = mediaUrl;
        }

        if (mediaType !== undefined) {
            answer.MediaType = mediaType;
        }

        await answer.save();

        return { 
            answer,
            message: 'Ответ успешно обновлен'
        };
    }

    async delete(answerId, userId) {
        if (!answerId) {
            throw new AppError('ID ответа обязателен', 400, 'VALIDATION_ERROR');
        }

        const answer = await Answer.findByPk(answerId, {
            include: [
                { 
                    model: Question, 
                    as: 'question',
                    include: [{ model: Quiz, as: 'quiz' }]
                }
            ]
        });

        if (!answer) {
            throw new AppError('Ответ не найден', 404, 'ANSWER_NOT_FOUND');
        }

        if (answer.question.quiz.UserId !== userId) {
            throw new AppError('Вы не являетесь автором этой викторины', 403, 'FORBIDDEN');
        }

        await answer.destroy();

        return { 
            message: 'Ответ успешно удален'
        };
    }

    async reorder(questionId, userId, answerOrders) {
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

        if (!Array.isArray(answerOrders)) {
            throw new AppError('Неверный формат данных', 400, 'VALIDATION_ERROR');
        }

        for (const item of answerOrders) {
            await Answer.update(
                { OrderNum: item.order },
                { where: { AnswerId: item.id, QuestionId: questionId } }
            );
        }

        return { 
            message: 'Порядок ответов успешно обновлен'
        };
    }
}

module.exports = new AnswerService();