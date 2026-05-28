const answerService = require('../services/answerService');
const { AppError } = require('../middleware/errorHandler');
const { upload, deleteFile } = require('../config/multer');
const path = require('path');

const answerController = {
    getAll: async (req, res, next) => {
        try {
            const questionId = req.params.questionId;
            const result = await answerService.getAll(questionId);

            res.status(200).json({
                success: true,
                data: result.answers
            });
        } catch (error) {
            next(error);
        }
    },

    getById: async (req, res, next) => {
        try {
            const answerId = req.params.id;
            const result = await answerService.getById(answerId);

            res.status(200).json({
                success: true,
                data: result.answer
            });
        } catch (error) {
            next(error);
        }
    },

    create: [
        upload.single('file'),
        async (req, res, next) => {
            try {
                const questionId = req.params.questionId;
                const userId = req.user.userId;
                const { text, isCorrect, orderNum, mediaUrl: existingMediaUrl, mediaType: existingMediaType } = req.body;

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
                    throw new AppError('Текст ответа обязателен', 400, 'VALIDATION_ERROR');
                }

                const result = await answerService.create(
                    questionId, userId, text, isCorrect === 'true' || isCorrect === true,
                    orderNum, mediaUrl, mediaType
                );

                res.status(201).json({
                    success: true,
                    message: result.message,
                    data: result.answer
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
                const answerId = req.params.id;
                const userId = req.user.userId;
                const { text, isCorrect, orderNum, mediaUrl: existingMediaUrl, mediaType: existingMediaType, deleteMedia } = req.body;

                let mediaUrl = existingMediaUrl;
                let mediaType = existingMediaType;

                if (deleteMedia === 'true' || deleteMedia === true) {
                    mediaUrl = null;
                    mediaType = null;

                    const oldAnswer = await answerService.getById(answerId);
                    if (oldAnswer.answer.MediaUrl) {
                        const oldFilePath = path.join(__dirname, '..', oldAnswer.answer.MediaUrl);
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

                    const oldAnswer = await answerService.getById(answerId);
                    if (oldAnswer.answer.MediaUrl) {
                        const oldFilePath = path.join(__dirname, '..', oldAnswer.answer.MediaUrl);
                        deleteFile(oldFilePath);
                    }
                }

                const result = await answerService.update(
                    answerId, userId, text, isCorrect === 'true' || isCorrect === true,
                    orderNum, mediaUrl, mediaType
                );

                res.status(200).json({
                    success: true,
                    message: result.message,
                    data: result.answer
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
            const answerId = req.params.id;
            const userId = req.user.userId;

            const answer = await answerService.getById(answerId);
            if (answer.answer.MediaUrl) {
                const filePath = path.join(__dirname, '..', answer.answer.MediaUrl);
                deleteFile(filePath);
            }

            const result = await answerService.delete(answerId, userId);

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
            const questionId = req.params.questionId;
            const userId = req.user.userId;
            const { answerOrders } = req.body;

            const result = await answerService.reorder(questionId, userId, answerOrders);

            res.status(200).json({
                success: true,
                message: result.message
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = answerController;