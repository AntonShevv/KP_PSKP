const express = require('express');
const quizController = require('../controllers/quizController');
const { authenticate, canCreate } = require('../middleware/auth');

const router = express.Router();

router.get('/my', authenticate, quizController.getByUser);
router.post('/upload-image', authenticate, quizController.uploadImage);
router.get('/', quizController.getAll);
router.get('/:id', quizController.getById);
router.post('/', authenticate, canCreate, quizController.create);
router.put('/:id', authenticate, canCreate, quizController.update);
router.patch('/:id/publish', authenticate, canCreate, quizController.togglePublish);
router.delete('/:id', authenticate, canCreate, quizController.delete);

module.exports = router;