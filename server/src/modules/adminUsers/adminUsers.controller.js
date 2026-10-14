import { adminUsersService } from './adminUsers.service.js';
import { adminUsersValidation } from './adminUsers.validation.js';
import { activityService } from '../activity/activity.service.js';

const ctxFromReq = (req) => ({
  actorId: req.user?.id,
  actorName: req.user?.name,
  actorEmail: req.user?.email,
  ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
});

export const adminUsersController = {
  list: async (req, res) => {
    try {
      const users = await adminUsersService.list();
      res.status(200).json({ users });
    } catch (e) {
      console.error('[adminUsers.list]', e);
      res.status(500).json({ message: 'Failed to load users' });
    }
  },

  invite: async (req, res) => {
    try {
      const validated = adminUsersValidation.inviteUserSchema.parse(req.body);
      const { user, tempPassword } = await adminUsersService.invite(validated);
      activityService.log({
        ...ctxFromReq(req),
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        entityLabel: `${user.name} <${user.email}>`,
        details: { role: user.role },
      });
      res.status(201).json({ user, tempPassword });
    } catch (e) {
      if (e.errors) return res.status(400).json({ errors: e.errors });
      if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
      console.error('[adminUsers.invite]', e);
      res.status(500).json({ message: 'Failed to invite user' });
    }
  },

  update: async (req, res) => {
    try {
      const validated = adminUsersValidation.updateUserSchema.parse(req.body);
      const user = await adminUsersService.update(req.params.id, validated);
      activityService.log({
        ...ctxFromReq(req),
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: user.id,
        entityLabel: `${user.name} <${user.email}>`,
      });
      res.status(200).json({ user });
    } catch (e) {
      if (e.errors) return res.status(400).json({ errors: e.errors });
      if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
      console.error('[adminUsers.update]', e);
      res.status(500).json({ message: 'Failed to update user' });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { user, tempPassword } = await adminUsersService.resetPassword(req.params.id);
      activityService.log({
        ...ctxFromReq(req),
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: user.id,
        entityLabel: `${user.name} <${user.email}>`,
        details: { passwordReset: true, sessionsRevoked: true },
      });
      res.status(200).json({ user, tempPassword });
    } catch (e) {
      if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
      console.error('[adminUsers.resetPassword]', e);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  },

  remove: async (req, res) => {
    try {
      const user = await adminUsersService.remove(req.params.id, { actorId: req.user.id });
      activityService.log({
        ...ctxFromReq(req),
        action: 'USER_DELETED',
        entityType: 'User',
        entityId: user.id,
        entityLabel: `${user.name} <${user.email}>`,
      });
      res.status(200).json({ message: 'User deleted' });
    } catch (e) {
      if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
      console.error('[adminUsers.remove]', e);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  },
};
