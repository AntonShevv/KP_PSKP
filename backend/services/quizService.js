const { Quiz, Category, User, Question, sequelize } = require('../sequelize/models');
const { AppError } = require('../middleware/errorHandler');
const fs = require('fs');
const path = require('path');

class QuizService {
    async getAll() {
        const quizzes = await Quiz.findAll({
            where: { IsPublished: true },
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM Questions AS Q
                            WHERE Q.QuizId = Quiz.QuizId
                        )`),
                        'questionsCount'
                    ]
                ]
            },
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['CategoryId', 'Name']
                },
                {
                    model: User,
                    as: 'author',
                    attributes: ['UserId', 'Login', 'Rating']
                }
            ],
            order: [['CreatedAt', 'DESC']]
        });

        const result = quizzes.map(quiz => {
            const plainQuiz = quiz.get({ plain: true });
            return {
                ...plainQuiz,
                questionsCount: parseInt(plainQuiz.questionsCount) || 0
            };
        });

        return { quizzes: result };
    }

    async getByUser(userId) {
        const quizzes = await Quiz.findAll({
            where: { UserId: userId },
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM Questions AS Q
                            WHERE Q.QuizId = Quiz.QuizId
                        )`),
                        'questionsCount'
                    ]
                ]
            },
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['CategoryId', 'Name']
                }
            ],
            order: [['CreatedAt', 'DESC']]
        });

        const result = quizzes.map(quiz => {
            const plainQuiz = quiz.get({ plain: true });
            return {
                ...plainQuiz,
                questionsCount: parseInt(plainQuiz.questionsCount) || 0
            };
        });

        return { quizzes: result };
    }

    async getById(quizId) {
        if (!quizId) {
            throw new AppError('ID викторины обязателен', 400, 'VALIDATION_ERROR');
        }

        const quiz = await Quiz.findByPk(quizId, {
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM Questions AS Q
                            WHERE Q.QuizId = Quiz.QuizId
                        )`),
                        'questionsCount'
                    ]
                ]
            },
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['CategoryId', 'Name']
                },
                {
                    model: User,
                    as: 'author',
                    attributes: ['UserId', 'Login', 'Rating']
                }
            ]
        });

        if (!quiz) {
            throw new AppError('Викторина не найдена', 404, 'QUIZ_NOT_FOUND');
        }

        const plainQuiz = quiz.get({ plain: true });
        const result = {
            ...plainQuiz,
            questionsCount: parseInt(plainQuiz.questionsCount) || 0
        };

        return { quiz: result };
    }

    async create(userId, title, description, categoryId, difficulty, defaultQuestionTime, pointsPerQuestion, imageUrl = null) {
        if (!userId) {
            throw new AppError('Не авторизован', 401, 'UNAUTHORIZED');
        }

        if (!title || title.trim().length < 3) {
            throw new AppError('Название викторины обязательно и должно содержать минимум 3 символа', 400, 'VALIDATION_ERROR');
        }

        if (!categoryId) {
            throw new AppError('Категория обязательна', 400, 'VALIDATION_ERROR');
        }

        const category = await Category.findByPk(categoryId);
        if (!category) {
            throw new AppError('Категория не найдена', 404, 'CATEGORY_NOT_FOUND');
        }

        const quiz = await Quiz.create({
            UserId: userId,
            Title: title.trim(),
            FullDescription: description || null,
            CategoryId: categoryId,
            Difficulty: difficulty || 'medium',
            DefaultQuestionTime: defaultQuestionTime || 30,
            PointsPerQuestion: pointsPerQuestion || 100,
            IsPublished: false,
            ImageUrl: imageUrl,
            CreatedAt: new Date(),
            UpdatedAt: new Date()
        });

        const plainQuiz = quiz.get({ plain: true });
        const result = {
            ...plainQuiz,
            questionsCount: 0
        };

        return {
            quiz: result,
            message: 'Викторина успешно создана'
        };
    }

    async update(quizId, userId, title, description, categoryId, difficulty, defaultQuestionTime, pointsPerQuestion, isPublished, imageUrl = null) {
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

        if (title && title.trim()) {
            quiz.Title = title.trim();
        }

        if (description !== undefined) {
            quiz.FullDescription = description;
        }

        if (categoryId) {
            const category = await Category.findByPk(categoryId);
            if (!category) {
                throw new AppError('Категория не найдена', 404, 'CATEGORY_NOT_FOUND');
            }
            quiz.CategoryId = categoryId;
        }

        if (difficulty) {
            quiz.Difficulty = difficulty;
        }

        if (defaultQuestionTime) {
            quiz.DefaultQuestionTime = defaultQuestionTime;
        }

        if (pointsPerQuestion) {
            quiz.PointsPerQuestion = pointsPerQuestion;
        }

        if (isPublished !== undefined) {
            quiz.IsPublished = isPublished;
        }

        if (imageUrl !== null) {
            if (quiz.ImageUrl && quiz.ImageUrl !== imageUrl) {
                const oldImagePath = path.join(__dirname, '../uploads/images', path.basename(quiz.ImageUrl));
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            quiz.ImageUrl = imageUrl;
        }

        quiz.UpdatedAt = new Date();
        await quiz.save();

        const questionsCount = await Question.count({ where: { QuizId: quizId } });

        const plainQuiz = quiz.get({ plain: true });
        const result = {
            ...plainQuiz,
            questionsCount
        };

        return {
            quiz: result,
            message: 'Викторина успешно обновлена'
        };
    }

    async delete(quizId, userId, isAdmin = false) {
        if (!quizId) {
            throw new AppError('ID викторины обязателен', 400, 'VALIDATION_ERROR');
        }

        const quiz = await Quiz.findByPk(quizId);

        if (!quiz) {
            throw new AppError('Викторина не найдена', 404, 'QUIZ_NOT_FOUND');
        }

        if (quiz.UserId !== userId && !isAdmin) {
            throw new AppError('Вы не являетесь автором этой викторины', 403, 'FORBIDDEN');
        }

        if (quiz.ImageUrl) {
            const imagePath = path.join(__dirname, '../uploads/images', path.basename(quiz.ImageUrl));
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await quiz.destroy();

        return {
            message: 'Викторина успешно удалена'
        };
    }

    async togglePublish(quizId, userId) {
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

        quiz.IsPublished = !quiz.IsPublished;
        quiz.UpdatedAt = new Date();
        await quiz.save();

        const questionsCount = await Question.count({ where: { QuizId: quizId } });

        const plainQuiz = quiz.get({ plain: true });
        const result = {
            ...plainQuiz,
            questionsCount
        };

        return {
            quiz: result,
            message: quiz.IsPublished ? 'Викторина опубликована' : 'Викторина снята с публикации'
        };
    }
}

module.exports = new QuizService();