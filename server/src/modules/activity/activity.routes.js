import express from 'express';
import { activityController } from './activity.controller.js';
import { authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();
router.use(authorize('ADMIN'));

router.get('/', activityController.list);

export default router;
