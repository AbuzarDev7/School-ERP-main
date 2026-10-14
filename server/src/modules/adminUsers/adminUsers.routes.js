import express from 'express';
import { adminUsersController } from './adminUsers.controller.js';
import { authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();
router.use(authorize('ADMIN'));

router.get('/', adminUsersController.list);
router.post('/', adminUsersController.invite);
router.patch('/:id', adminUsersController.update);
router.post('/:id/reset-password', adminUsersController.resetPassword);
router.delete('/:id', adminUsersController.remove);

export default router;
