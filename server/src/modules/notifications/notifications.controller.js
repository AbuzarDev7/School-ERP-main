import { notificationsService } from './notifications.service.js';
import { notificationsValidation } from './notifications.validation.js';

export const notificationsController = {
  listTemplates: async (req, res) => {
    try {
      const templates = await notificationsService.listTemplates();
      res.status(200).json({ templates });
    } catch (error) {
      console.error('[notifications.listTemplates]', error);
      res.status(500).json({ message: 'Failed to load templates' });
    }
  },

  updateTemplate: async (req, res) => {
    try {
      const validated = notificationsValidation.updateTemplateSchema.parse(req.body);
      const template = await notificationsService.updateTemplate(req.params.id, validated);
      res.status(200).json({ message: 'Template updated', template });
    } catch (error) {
      if (error.errors) return res.status(400).json({ errors: error.errors });
      console.error('[notifications.updateTemplate]', error);
      res.status(500).json({ message: 'Failed to update template' });
    }
  },

  listLogs: async (req, res) => {
    try {
      const logs = await notificationsService.listLogs({ limit: req.query.limit });
      res.status(200).json({ logs });
    } catch (error) {
      console.error('[notifications.listLogs]', error);
      res.status(500).json({ message: 'Failed to load logs' });
    }
  },

  sendTest: async (req, res) => {
    try {
      const validated = notificationsValidation.sendTestSchema.parse(req.body);
      const log = await notificationsService.sendTest(validated);
      res.status(200).json({ message: 'Test dispatched', log });
    } catch (error) {
      if (error.errors) return res.status(400).json({ errors: error.errors });
      console.error('[notifications.sendTest]', error);
      res.status(500).json({ message: error.message || 'Failed to send test' });
    }
  },
};
