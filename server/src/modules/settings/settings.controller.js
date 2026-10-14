import { settingsService } from './settings.service.js';
import { settingsValidation } from './settings.validation.js';
import { activityService } from '../activity/activity.service.js';

const ctxFromReq = (req) => ({
  actorId: req.user?.id,
  actorName: req.user?.name,
  actorEmail: req.user?.email,
  ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
});

export const settingsController = {
  get: async (req, res) => {
    try {
      const settings = await settingsService.get();
      res.status(200).json({ settings });
    } catch (error) {
      console.error('[settings.get]', error);
      res.status(500).json({ message: 'Failed to load settings' });
    }
  },

  update: async (req, res) => {
    try {
      const validated = settingsValidation.updateSettingsSchema.parse(req.body);
      const settings = await settingsService.update(validated);
      activityService.log({
        ...ctxFromReq(req),
        action: 'SETTINGS_UPDATED',
        details: { keys: Object.keys(validated) },
      });
      res.status(200).json({ message: 'Settings updated', settings });
    } catch (error) {
      if (error.errors) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('[settings.update]', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  },

  uploadLogo: async (req, res) => {
    try {
      const settings = await settingsService.uploadLogo(req.file);
      res.status(200).json({ message: 'Logo uploaded', settings });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error('[settings.uploadLogo]', error);
      res.status(500).json({ message: 'Failed to upload logo' });
    }
  },

  removeLogo: async (req, res) => {
    try {
      const settings = await settingsService.removeLogo();
      res.status(200).json({ message: 'Logo removed', settings });
    } catch (error) {
      console.error('[settings.removeLogo]', error);
      res.status(500).json({ message: 'Failed to remove logo' });
    }
  },

  getStudentSequences: async (req, res) => {
    try {
      const data = await settingsService.getStudentSequences();
      res.status(200).json(data);
    } catch (error) {
      console.error('[settings.getStudentSequences]', error);
      res.status(500).json({ message: 'Failed to read student sequences' });
    }
  },

  restartRegNumberSequence: async (req, res) => {
    try {
      const { startFrom } = settingsValidation.restartSequenceSchema.parse(req.body);
      const result = await settingsService.restartRegNumberSequence(startFrom);
      activityService.log({
        ...ctxFromReq(req),
        action: 'SETTINGS_UPDATED',
        entityType: 'Sequence',
        entityLabel: 'Student.regNumber',
        details: { restartFrom: startFrom },
      });
      res.status(200).json({ message: `Next registration number will be ${startFrom}`, ...result });
    } catch (error) {
      if (error.errors) return res.status(400).json({ errors: error.errors });
      if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
      console.error('[settings.restartRegNumberSequence]', error);
      res.status(500).json({ message: 'Failed to restart registration sequence' });
    }
  },

  restartRollNumberSequence: async (req, res) => {
    try {
      const { startFrom } = settingsValidation.restartSequenceSchema.parse(req.body);
      const result = await settingsService.restartRollNumberSequence(startFrom);
      activityService.log({
        ...ctxFromReq(req),
        action: 'SETTINGS_UPDATED',
        entityType: 'Sequence',
        entityLabel: 'Student.rollNumber',
        details: { restartFrom: startFrom, warning: result.warning || undefined },
      });
      res.status(200).json({ message: `Next roll number will be ${startFrom}`, ...result });
    } catch (error) {
      if (error.errors) return res.status(400).json({ errors: error.errors });
      if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
      console.error('[settings.restartRollNumberSequence]', error);
      res.status(500).json({ message: 'Failed to restart roll sequence' });
    }
  },
};
