import { voucherService } from "./voucher.service.js";
import { editVoucherSchema, updateStatusSchema, voucherSchema } from "./voucher.validation.js";
import { sendError } from "../../../utils/sendError.js";
import { activityService } from "../../activity/activity.service.js";
import { z } from "zod";

const ctxFromReq = (req) => ({
  actorId: req.user?.id,
  actorName: req.user?.name,
  actorEmail: req.user?.email,
  ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
});

export const createVoucher = async (req, res) => {
  try {
    const parsed = voucherSchema.parse(req.body);
    parsed.totalPayable = parsed.amount + (parsed.arrears || 0) + (parsed.fine || 0) - (parsed.discount || 0);

    const voucher = await voucherService.create(parsed);
    activityService.log({
      ...ctxFromReq(req),
      action: 'VOUCHER_CREATED',
      entityType: 'Voucher',
      entityId: voucher.id,
      entityLabel: voucher.voucherNumber,
      details: { totalPayable: voucher.totalPayable, month: voucher.month },
    });
    res.status(201).json(voucher);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data provided" });
    }
    // Voucher service raises plain Errors for friendly messages (duplicate
    // month, invalid student, etc). Treat them as 400s so the client sees
    // them, while genuine 500s are sanitized through sendError.
    if (!err.statusCode) err.statusCode = 400;
    sendError(res, err);
  }
};

export const getVouchers = async (req, res) => {
  try {
    const data = await voucherService.getAll();
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
};

export const createBulkVouchers = async (req, res) => {
  try {
    const { vouchers } = req.body;
    if (!Array.isArray(vouchers)) throw new Error("Expected an array of vouchers");

    const validatedData = vouchers.map(v => {
      const parsedVoucher = voucherSchema.parse(v);
      parsedVoucher.totalPayable = parsedVoucher.amount + (parsedVoucher.arrears || 0) + (parsedVoucher.fine || 0) - (parsedVoucher.discount || 0);
      return parsedVoucher;
    });
    const createdVouchers = await voucherService.createBulk(validatedData);
    res.status(201).json(createdVouchers);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data provided" });
    }
    if (!err.statusCode) err.statusCode = 400;
    sendError(res, err);
  }
};

export const updateVoucherStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateStatusSchema.parse(req.body);

    const updated = await voucherService.updateStatus(id, validatedData);
    // Distinguish a money-collection update from a no-op status flip — the
    // former is the audit-worthy event for cashier accountability.
    if (Number(updated.paidAmount || 0) > 0 && (validatedData.paidAmount || validatedData.status === 'PAID')) {
      activityService.log({
        ...ctxFromReq(req),
        action: 'PAYMENT_COLLECTED',
        entityType: 'Voucher',
        entityId: updated.id,
        entityLabel: updated.voucherNumber,
        details: { paidAmount: updated.paidAmount, paymentMethod: updated.paymentMethod },
      });
    } else {
      activityService.log({
        ...ctxFromReq(req),
        action: 'VOUCHER_UPDATED',
        entityType: 'Voucher',
        entityId: updated.id,
        entityLabel: updated.voucherNumber,
      });
    }
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data provided" });
    }
    sendError(res, err);
  }
};

export const editVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = editVoucherSchema.parse(req.body);
    const updated = await voucherService.edit(id, validatedData);
    activityService.log({
      ...ctxFromReq(req),
      action: 'VOUCHER_UPDATED',
      entityType: 'Voucher',
      entityId: updated.id,
      entityLabel: updated.voucherNumber,
      details: { fields: Object.keys(validatedData) },
    });
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid data provided" });
    }
    sendError(res, err);
  }
};

export const deleteVoucher = async (req, res) => {
  try {
    const removed = await voucherService.delete(req.params.id);
    activityService.log({
      ...ctxFromReq(req),
      action: 'VOUCHER_DELETED',
      entityType: 'Voucher',
      entityId: removed.id,
      entityLabel: removed.voucherNumber,
    });
    res.json({ message: "Voucher deleted" });
  } catch (err) {
    sendError(res, err);
  }
};