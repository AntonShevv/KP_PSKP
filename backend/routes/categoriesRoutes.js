const express = require('express');
const categoriesController = require('../controllers/categoriesController');
const { authenticate, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', categoriesController.getAll);
router.get('/:id', authenticate, categoriesController.getById);
router.post('/', authenticate, isAdmin, categoriesController.add);
router.put('/:id', authenticate, isAdmin, categoriesController.update);
router.delete('/:id', authenticate, isAdmin, categoriesController.delete);

module.exports = router;