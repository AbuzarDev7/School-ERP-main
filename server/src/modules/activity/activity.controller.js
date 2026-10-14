import { activityService } from './activity.service.js';

export const activityController = {
  list: async (req, res) => {
    try {
      const logs = await activityService.list({
        limit: req.query.limit,
        action: req.query.action,
        actorId: req.query.actorId,
        entityType: req.query.entityType,
        entityId: req.query.entityId,
      });
      res.status(200).json({ logs });
    } catch (e) {
      console.error('[activity.list]', e);
      res.status(500).json({ message: 'Failed to load activity log' });
    }
  },
};
