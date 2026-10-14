import { Router } from "express";
import {
  createWorker,
  getAllWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker,
  createPayment,
  reactivateWorker,
  createAdvance,
  updateAdvance,
  deleteAdvance,
  createExtraHours,
  updateExtraHours,
  deleteExtraHours,
  undoPayment,
  getPayrollContext
} from "./worker.controller.js";
import { singleImageUpload } from "../../middleware/upload.middleware.js";

const router = Router();

// Wraps multer so its errors (file too large, wrong type) return a readable
// 400 JSON response instead of falling through to the generic 500 handler.
const handleUpload = (req, res, next) => {
  singleImageUpload(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Profile photo must be 1 MB or smaller.'
      : (err.message || 'File upload failed. Use JPG, PNG, or WebP.');
    return res.status(400).json({ error: message });
  });
};

router.route("/").post(handleUpload, createWorker).get(getAllWorkers);
router.route("/payments").post(createPayment);
router.route("/payments/:id/undo").delete(undoPayment);
router.route("/:id/reactivate").put(reactivateWorker);
router.route("/:id/payroll-context").get(getPayrollContext);
router.route("/advances").post(createAdvance);
router.route("/advances/:id").put(updateAdvance).delete(deleteAdvance);
router.route("/extra-hours").post(createExtraHours);
router.route("/extra-hours/:id").put(updateExtraHours).delete(deleteExtraHours);
router.route("/:id").get(getWorkerById).put(handleUpload, updateWorker).delete(deleteWorker);

export default router;
