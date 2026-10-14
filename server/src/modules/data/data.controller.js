import { dataService } from './data.service.js';
import { activityService } from '../activity/activity.service.js';

const ctxFromReq = (req) => ({
  actorId: req.user?.id,
  actorName: req.user?.name,
  actorEmail: req.user?.email,
  ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
});

// Pulls the row array out of the request body. The client always wraps the
// parsed JSON file under `rows`, but a hand-crafted curl might send the
// array at the top level — be forgiving.
const extractRows = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.rows)) return body.rows;
  return null;
};

const summary = (result) =>
  `${result.inserted} inserted, ${result.skipped.length} skipped${result.errors.length > 0 ? `, ${result.errors.length} error(s)` : ''}`;

const ALLOWED_TYPES = new Set(['students', 'vouchers', 'payments']);
const ALLOWED_FORMATS = new Set(['csv', 'json']);

export const dataController = {
  exportData: async (req, res) => {
    try {
      const type = String(req.query.type || '').toLowerCase();
      const format = String(req.query.format || 'csv').toLowerCase();

      if (!ALLOWED_TYPES.has(type)) {
        return res.status(400).json({ message: `Unknown type. Use one of: students, vouchers, payments.` });
      }
      if (!ALLOWED_FORMATS.has(format)) {
        return res.status(400).json({ message: `Unknown format. Use csv or json.` });
      }

      const { filename, contentType, body } = await dataService.exportData({ type, format });
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(body);
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
      console.error('[data.export]', error);
      res.status(500).json({ message: 'Failed to export data' });
    }
  },

  resetAcademicYear: async (req, res) => {
    try {
      const { confirmation } = req.body || {};
      const result = await dataService.resetAcademicYear(confirmation);
      res.status(200).json({ message: 'Academic year reset', ...result });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
      console.error('[data.resetAcademicYear]', error);
      res.status(500).json({ message: 'Failed to reset academic year' });
    }
  },

  importStudents: async (req, res) => {
    try {
      const rows = extractRows(req.body);
      if (!rows) return res.status(400).json({ message: 'Body must be an array of rows or { rows: [...] }' });
      const result = await dataService.importStudents(rows);
      activityService.log({
        ...ctxFromReq(req),
        action: 'SETTINGS_UPDATED',
        entityType: 'Import',
        entityLabel: 'Students',
        details: { total: result.total, inserted: result.inserted, skipped: result.skipped.length, errors: result.errors.length },
      });
      res.status(200).json({ message: `Students: ${summary(result)}`, ...result });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
      console.error('[data.importStudents]', error);
      res.status(500).json({ message: error?.message || 'Failed to import students' });
    }
  },

  importVouchers: async (req, res) => {
    try {
      const rows = extractRows(req.body);
      if (!rows) return res.status(400).json({ message: 'Body must be an array of rows or { rows: [...] }' });
      const result = await dataService.importVouchers(rows);
      activityService.log({
        ...ctxFromReq(req),
        action: 'SETTINGS_UPDATED',
        entityType: 'Import',
        entityLabel: 'Vouchers',
        details: { total: result.total, inserted: result.inserted, skipped: result.skipped.length, errors: result.errors.length },
      });
      res.status(200).json({ message: `Vouchers: ${summary(result)}`, ...result });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
      console.error('[data.importVouchers]', error);
      res.status(500).json({ message: error?.message || 'Failed to import vouchers' });
    }
  },

  importPayments: async (req, res) => {
    try {
      const rows = extractRows(req.body);
      if (!rows) return res.status(400).json({ message: 'Body must be an array of rows or { rows: [...] }' });
      const result = await dataService.importPayments(rows);
      activityService.log({
        ...ctxFromReq(req),
        action: 'SETTINGS_UPDATED',
        entityType: 'Import',
        entityLabel: 'Payments',
        details: { total: result.total, inserted: result.inserted, skipped: result.skipped.length, errors: result.errors.length },
      });
      res.status(200).json({ message: `Payments: ${summary(result)}`, ...result });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
      console.error('[data.importPayments]', error);
      res.status(500).json({ message: error?.message || 'Failed to import payments' });
    }
  },

  wipeAllData: async (req, res) => {
    try {
      const { confirmation } = req.body || {};
      await dataService.wipeAllData(confirmation);
      res.status(200).json({ message: 'All operational data wiped' });
    } catch (error) {
      if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
      console.error('[data.wipeAllData]', error);
      res.status(500).json({ message: 'Failed to wipe data' });
    }
  },
};
