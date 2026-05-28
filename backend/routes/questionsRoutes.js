const express = require('express');
const questionController = require('../controllers/questionController');
const { authenticate, canCreate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.get('/', authenticate, questionController.getAll);
router.get('/:id', authenticate, questionController.getById);
router.post('/', authenticate, canCreate, questionController.create);
router.put('/:id', authenticate, canCreate, questionController.update);
router.delete('/:id', authenticate, canCreate, questionController.delete);
router.patch('/reorder', authenticate, canCreate, questionController.reorder);

module.exports = router;