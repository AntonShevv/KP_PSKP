const express = require('express');
const answerController = require('../controllers/answerController');
const { authenticate, canCreate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.get('/', authenticate, answerController.getAll);
router.get('/:id', authenticate, answerController.getById);
router.post('/', authenticate, canCreate, answerController.create);
router.put('/:id', authenticate, canCreate, answerController.update);
router.delete('/:id', authenticate, canCreate, answerController.delete);
router.patch('/reorder', authenticate, canCreate, answerController.reorder);

module.exports = router;