import { rolesService } from './roles.service.js';
import { rolesValidation } from './roles.validation.js';
import { activityService } from '../activity/activity.service.js';

const ctxFromReq = (req) => ({
  actorId: req.user?.id,
  actorName: req.user?.name,
  actorEmail: req.user?.email,
  ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
});

export const rolesController = {
  listPermissions: async (req, res) => {
    try {
      const permissions = await rolesService.listPermissions();
      res.status(200).json({ permissions });
    } catch (e) {
      console.error('[roles.listPermissions]', e);
      res.status(500).json({ message: 'Failed to load permissions' });
    }
  },

  list: async (req, res) => {
    try {
      const roles = await rolesService.list();
      res.status(200).json({ roles });
    } catch (e) {
      console.error('[roles.list]', e);
      res.status(500).json({ message: 'Failed to load roles' });
    }
  },

  create: async (req, res) => {
    try {
      const validated = rolesValidation.createRoleSchema.parse(req.body);
      const role = await rolesService.create(validated);
      activityService.log({ ...ctxFromReq(req), action: 'ROLE_CREATED', entityType: 'Role', entityId: role.id, entityLabel: role.name });
      res.status(201).json({ role });
    } catch (e) {
      if (e.errors) return res.status(400).json({ errors: e.errors });
      if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
      console.error('[roles.create]', e);
      res.status(500).json({ message: 'Failed to create role' });
    }
  },

  update: async (req, res) => {
    try {
      const validated = rolesValidation.updateRoleSchema.parse(req.body);
      const role = await rolesService.update(req.params.id, validated);
      activityService.log({ ...ctxFromReq(req), action: 'ROLE_UPDATED', entityType: 'Role', entityId: role.id, entityLabel: role.name });
      res.status(200).json({ role });
    } catch (e) {
      if (e.errors) return res.status(400).json({ errors: e.errors });
      if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
      console.error('[roles.update]', e);
      res.status(500).json({ message: 'Failed to update role' });
    }
  },

  remove: async (req, res) => {
    try {
      const removed = await rolesService.remove(req.params.id);
      activityService.log({ ...ctxFromReq(req), action: 'ROLE_DELETED', entityType: 'Role', entityId: removed.id, entityLabel: removed.name });
      res.status(200).json({ message: 'Role deleted' });
    } catch (e) {
      if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
      console.error('[roles.remove]', e);
      res.status(500).json({ message: 'Failed to delete role' });
    }
  },
};
