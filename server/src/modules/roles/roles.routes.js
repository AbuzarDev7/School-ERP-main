import express from 'express';
import { rolesController } from './roles.controller.js';
import { authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Roles configuration is admin territory.
router.use(authorize('ADMIN'));

router.get('/permissions', rolesController.listPermissions);
router.get('/', rolesController.list);
router.post('/', rolesController.create);
router.patch('/:id', rolesController.update);
router.delete('/:id', rolesController.remove);

export default router;
