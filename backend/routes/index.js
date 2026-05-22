const express = require('express');
const authRoutes = require('./authRoutes');
const categoriesRoutes = require('./categoriesRoutes');
const quizRoutes = require('./quizRoutes');
const questionRoutes = require('./questionsRoutes');
const answerRoutes = require('./answerRoutes');
const statisticsRoutes = require('./statisticsRoutes');
const adminRoutes = require('./adminRoutes');
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/categories', categoriesRoutes);
router.use('/quizzes', quizRoutes);
router.use('/quizzes/:quizId/questions', questionRoutes);
router.use('/questions/:questionId/answers', answerRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/admin', adminRoutes);

module.exports = router;

