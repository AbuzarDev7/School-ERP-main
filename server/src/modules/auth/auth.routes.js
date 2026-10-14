// server/src/modules/auth/auth.routes.js
import express from 'express';
import { authController } from './auth.controller.js';
import { protect } from '../../middleware/authMiddleware.js';
import { singleImageUpload } from '../../middleware/upload.middleware.js';

const router = express.Router();

// router.post('/register', authController.register); // Registration is not required, so this route is commented out for now
router.post('/login', authController.login);

// Authenticated profile management — used by the Settings screen.
router.get('/profile', protect, authController.getProfile);
router.patch('/profile', protect, authController.updateProfile);
router.patch('/password', protect, authController.changePassword);
router.post('/avatar', protect, singleImageUpload, authController.uploadAvatar);
router.delete('/avatar', protect, authController.removeAvatar);

// Session management — powers the Settings → Sessions tab.
router.post('/logout', protect, authController.logout);
router.get('/sessions', protect, authController.listSessions);
router.delete('/sessions', protect, authController.revokeOtherSessions);
router.delete('/sessions/:id', protect, authController.revokeSession);

export default router;