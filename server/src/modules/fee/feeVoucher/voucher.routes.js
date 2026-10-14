import express from "express";
import {
  createVoucher,
  getVouchers,
  updateVoucherStatus,
  editVoucher,
  deleteVoucher,
  createBulkVouchers,
} from "./voucher.controller.js";

const router = express.Router();

// @route   GET /api/vouchers
// @desc    Get all generated vouchers
router.get("/", getVouchers);

// @route   POST /api/vouchers
// @desc    Generate a new fee voucher
router.post("/", createVoucher);

// @route   POST /api/vouchers/bulk
// @desc    Generate multiple vouchers in bulk
router.post("/bulk", createBulkVouchers);

// @route   PATCH /api/vouchers/:id/status
// @desc    Update voucher status (e.g., Mark as PAID)
router.patch("/:id/status", updateVoucherStatus);

// @route   PATCH /api/vouchers/:id
// @desc    Cashier edit before any payment is recorded
router.patch("/:id", editVoucher);

// @route   DELETE /api/vouchers/:id
// @desc    Delete/Void a voucher
router.delete("/:id", deleteVoucher);

export default router;