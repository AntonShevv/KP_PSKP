const questionService = require('../services/questionService');
const { AppError } = require('../middleware/errorHandler');
const { upload, deleteFile } = require('../config/multer');
const path = require('path');

const questionController = {
    getAll: async (req, res, next) => {
        try {
            const quizId = req.params.quizId;
            const result = await questionService.getAll(quizId);

            res.status(200).json({
                success: true,
                data: result.questions
            });
        } catch (error) {
            next(error);
        }
    },

    getById: async (req, res, next) => {
        try {
            const questionId = req.params.id;
            const result = await questionService.getById(questionId);

            res.status(200).json({
                success: true,
                data: result.question
            });
        } catch (error) {
            next(error);
        }
    },

    create: [
        upload.single('file'),
        async (req, res, next) => {
            try {
                const quizId = req.params.quizId;
                const userId = req.user.userId;
                const { text, type, points, timeLimit, orderNum, mediaUrl: existingMediaUrl, mediaType: existingMediaType } = req.body;

                let mediaUrl = existingMediaUrl;
                let mediaType = existingMediaType;

                if (req.file) {
                    if (req.file.mimetype.startsWith('image/')) {
                        mediaType = 'image';
                    } else if (req.file.mimetype.startsWith('video/')) {
                        mediaType = 'video';
                    } else if (req.file.mimetype.startsWith('audio/')) {
                        mediaType = 'audio';
                    }

                    let typeFolder = 'other';
                    if (mediaType === 'image') typeFolder = 'images';
                    else if (mediaType === 'video') typeFolder = 'videos';
                    else if (mediaType === 'audio') typeFolder = 'audios';

                    mediaUrl = `/uploads/${typeFolder}/${req.file.filename}`;
                }

                if (!text) {
                    throw new AppError('Текст вопроса обязателен', 400, 'VALIDATION_ERROR');
                }

                const result = await questionService.create(quizId, userId, text, type, points, timeLimit, orderNum, mediaUrl, mediaType);

                res.status(201).json({
                    success: true,
                    message: result.message,
                    data: result.question
                });
            } catch (error) {
                if (req.file) {
                    const filePath = path.join(__dirname, '..', req.file.path);
                    deleteFile(filePath);
                }
                next(error);
            }
        }
    ],

    update: [
        upload.single('file'),
        async (req, res, next) => {
            try {
                const questionId = req.params.id;
                const userId = req.user.userId;
                const { text, type, points, timeLimit, orderNum, mediaUrl: existingMediaUrl, mediaType: existingMediaType, deleteMedia } = req.body;

                let mediaUrl = existingMediaUrl;
                let mediaType = existingMediaType;

                if (deleteMedia === 'true' || deleteMedia === true) {
                    mediaUrl = null;
                    mediaType = null;

                    const oldQuestion = await questionService.getById(questionId);
                    if (oldQuestion.question.MediaUrl) {
                        const oldFilePath = path.join(__dirname, '..', oldQuestion.question.MediaUrl);
                        deleteFile(oldFilePath);
                    }
                }

                if (req.file) {
                    if (req.file.mimetype.startsWith('image/')) {
                        mediaType = 'image';
                    } else if (req.file.mimetype.startsWith('video/')) {
                        mediaType = 'video';
                    } else if (req.file.mimetype.startsWith('audio/')) {
                        mediaType = 'audio';
                    }

                    let typeFolder = 'other';
                    if (mediaType === 'image') typeFolder = 'images';
                    else if (mediaType === 'video') typeFolder = 'videos';
                    else if (mediaType === 'audio') typeFolder = 'audios';

                    mediaUrl = `/uploads/${typeFolder}/${req.file.filename}`;

                    const oldQuestion = await questionService.getById(questionId);
                    if (oldQuestion.question.MediaUrl) {
                        const oldFilePath = path.join(__dirname, '..', oldQuestion.question.MediaUrl);
                        deleteFile(oldFilePath);
                    }
                }

                const result = await questionService.update(questionId, userId, text, type, points, timeLimit, orderNum, mediaUrl, mediaType);

                res.status(200).json({
                    success: true,
                    message: result.message,
                    data: result.question
                });
            } catch (error) {
                if (req.file) {
                    const filePath = path.join(__dirname, '..', req.file.path);
                    deleteFile(filePath);
                }
                next(error);
            }
        }
    ],

    delete: async (req, res, next) => {
        try {
            const questionId = req.params.id;
            const userId = req.user.userId;

            const question = await questionService.getById(questionId);
            if (question.question.MediaUrl) {
                const filePath = path.join(__dirname, '..', question.question.MediaUrl);
                deleteFile(filePath);
            }

            const result = await questionService.delete(questionId, userId);

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    },

    reorder: async (req, res, next) => {
        try {
            const quizId = req.params.quizId;
            const userId = req.user.userId;
            const { questionOrders } = req.body;

            const result = await questionService.reorder(quizId, userId, questionOrders);

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = questionController;