const express = require('express');
const authController = require('../controllers/authController.js');
const { authenticate } = require('../middleware/auth');
const passport = require('passport');
const { upload } = require('../config/multer');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateMe);
router.post('/me/avatar', authenticate, upload.single('avatar'), authController.uploadAvatar);

router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', session: false }),
    authController.googleCallback
);

module.exports = router;