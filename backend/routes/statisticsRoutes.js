const express = require('express');
const statisticsController = require('../controllers/statisticsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authenticate, statisticsController.getMyStats);
router.get('/games', authenticate, statisticsController.getMyGames);
router.get('/games/:sessionId/details', authenticate, statisticsController.getGameDetails);
router.get('/leaderboard', statisticsController.getLeaderboard);

module.exports = router;