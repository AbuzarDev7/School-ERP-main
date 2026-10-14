import express from 'express';
import { dataController } from './data.controller.js';
import { authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Exports are admin-only because they include personal data (CNICs, phone
// numbers, parent details). The danger-zone routes are obviously admin-only.
router.use(authorize('ADMIN'));

// Imports can be several megabytes (a year of vouchers for a 500-student
// school easily clears the default 100kb cap), so we mount a generous JSON
// parser ONLY on this sub-tree rather than raising the global limit.
const largeJson = express.json({ limit: '50mb' });

router.get('/export', dataController.exportData);
router.post('/import/students', largeJson, dataController.importStudents);
router.post('/import/vouchers', largeJson, dataController.importVouchers);
router.post('/import/payments', largeJson, dataController.importPayments);
router.post('/reset-academic-year', dataController.resetAcademicYear);
router.post('/wipe', dataController.wipeAllData);

export default router;
