import express from 'express';
import { notificationsController } from './notifications.controller.js';
import { authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Notifications carry personal data (recipient phone/email, body of the
// message). Reading + editing is restricted to admins.
router.use(authorize('ADMIN'));

router.get('/templates', notificationsController.listTemplates);
router.patch('/templates/:id', notificationsController.updateTemplate);
router.get('/logs', notificationsController.listLogs);
router.post('/test', notificationsController.sendTest);

export default router;
