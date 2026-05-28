const quizService = require('../services/quizService');
const { AppError } = require('../middleware/errorHandler');
const { upload, deleteFile } = require('../config/multer');
const path = require('path');

const quizController = {
    getAll: async (req, res, next) => {
        try {
            const result = await quizService.getAll();

            res.status(200).json({
                success: true,
                data: result.quizzes
            });
        } catch (error) {
            next(error);
        }
    },

    getByUser: async (req, res, next) => {
        try {
            const userId = req.user.userId;

            const result = await quizService.getByUser(userId);

            res.status(200).json({
                success: true,
                data: result.quizzes
            });
        } catch (error) {
            next(error);
        }
    },

    getById: async (req, res, next) => {
        try {
            const quizId = req.params.id;

            const result = await quizService.getById(quizId);

            res.status(200).json({
                success: true,
                data: result.quiz
            });
        } catch (error) {
            next(error);
        }
    },

    create: [
        upload.single('image'),
        async (req, res, next) => {
            try {
                const userId = req.user.userId;
                const { title, description, categoryId, difficulty, defaultQuestionTime, pointsPerQuestion, imageUrl: existingImageUrl } = req.body;

                let imageUrl = existingImageUrl;

                if (req.file) {
                    imageUrl = `/uploads/images/${req.file.filename}`;
                }

                if (!title) {
                    throw new AppError('Название викторины обязательно', 400, 'VALIDATION_ERROR');
                }

                if (!categoryId) {
                    throw new AppError('Категория обязательна', 400, 'VALIDATION_ERROR');
                }

                const result = await quizService.create(
                    userId, title, description, categoryId,
                    difficulty, defaultQuestionTime, pointsPerQuestion,
                    imageUrl
                );

                res.status(201).json({
                    success: true,
                    message: result.message,
                    data: result.quiz
                });
            } catch (error) {
                if (req.file) {
                    deleteFile(req.file.path);
                }
                next(error);
            }
        }
    ],

    update: [
        upload.single('image'),
        async (req, res, next) => {
            try {
                const quizId = req.params.id;
                const userId = req.user.userId;
                const { title, description, categoryId, difficulty, defaultQuestionTime, pointsPerQuestion, isPublished, imageUrl: existingImageUrl, deleteImage } = req.body;

                let imageUrl = existingImageUrl;

                if (deleteImage === 'true' || deleteImage === true) {
                    imageUrl = null;

                    const oldQuiz = await quizService.getById(quizId);
                    if (oldQuiz.quiz.ImageUrl) {
                        const oldFilePath = path.join(__dirname, '..', oldQuiz.quiz.ImageUrl);
                        deleteFile(oldFilePath);
                    }
                }

                if (req.file) {
                    imageUrl = `/uploads/images/${req.file.filename}`;

                    const oldQuiz = await quizService.getById(quizId);
                    if (oldQuiz.quiz.ImageUrl && !deleteImage) {
                        const oldFilePath = path.join(__dirname, '..', oldQuiz.quiz.ImageUrl);
                        deleteFile(oldFilePath);
                    }
                }

                const result = await quizService.update(
                    quizId, userId, title, description, categoryId,
                    difficulty, defaultQuestionTime, pointsPerQuestion,
                    isPublished, imageUrl
                );

                res.status(200).json({
                    success: true,
                    message: result.message,
                    data: result.quiz
                });
            } catch (error) {
                if (req.file) {
                    deleteFile(req.file.path);
                }
                next(error);
            }
        }
    ],

    delete: async (req, res, next) => {
        try {
            const quizId = req.params.id;
            const userId = req.user.userId;
            const isAdmin = req.user.role === 'admin';

            const quiz = await quizService.getById(quizId);
            if (quiz.quiz.ImageUrl) {
                const filePath = path.join(__dirname, '..', quiz.quiz.ImageUrl);
                deleteFile(filePath);
            }

            const result = await quizService.delete(quizId, userId, isAdmin);

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    },

    togglePublish: async (req, res, next) => {
        try {
            const quizId = req.params.id;
            const userId = req.user.userId;

            const result = await quizService.togglePublish(quizId, userId);

            res.status(200).json({
                success: true,
                message: result.message,
                data: result.quiz
            });
        } catch (error) {
            next(error);
        }
    },

    uploadImage: [
        upload.single('image'),
        async (req, res, next) => {
            try {
                if (!req.file) {
                    throw new AppError('Файл не загружен', 400, 'UPLOAD_ERROR');
                }

                if (!req.file.mimetype.startsWith('image/')) {
                    deleteFile(req.file.path);
                    throw new AppError('Можно загружать только изображения', 400, 'VALIDATION_ERROR');
                }

                const imageUrl = `/uploads/images/${req.file.filename}`;


                res.status(200).json({
                    success: true,
                    data: { imageUrl }
                });
            } catch (error) {
                console.error('Upload error:', error);
                if (req.file) {
                    deleteFile(req.file.path);
                }
                next(error);
            }
        }
    ]
};

module.exports = quizController;