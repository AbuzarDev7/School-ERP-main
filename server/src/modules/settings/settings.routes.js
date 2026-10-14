import express from 'express';
import { settingsController } from './settings.controller.js';
import { authorize } from '../../middleware/authMiddleware.js';
import { singleImageUpload } from '../../middleware/upload.middleware.js';

const router = express.Router();

// Read is allowed for any authenticated user (cashier needs voucher prefix,
// late-fee config, school name on printouts). Mutations are admin-only.
router.get('/', settingsController.get);

router.patch('/', authorize('ADMIN'), settingsController.update);
router.post('/logo', authorize('ADMIN'), singleImageUpload, settingsController.uploadLogo);
router.delete('/logo', authorize('ADMIN'), settingsController.removeLogo);

// Student-numbering sequences — separate from regular settings PATCH because
// ALTER SEQUENCE is an irreversible side-effect on the database.
router.get('/student-sequences', settingsController.getStudentSequences);
router.post('/student-sequences/reg', authorize('ADMIN'), settingsController.restartRegNumberSequence);
router.post('/student-sequences/roll', authorize('ADMIN'), settingsController.restartRollNumberSequence);

export default router;
