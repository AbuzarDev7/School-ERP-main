import { z } from "zod";
import { paymentMethodService } from "./paymentMethod.service.js";
import { paymentMethodSchema, paymentTransferSchema } from "./paymentMethod.validation.js";
import { sendError } from "../../utils/sendError.js";

function handleError(res, error) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: "Validation failed", details: error.errors });
  }
  return sendError(res, error);
}

export const listMethods = async (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === "true";
    const methods = await paymentMethodService.getAll({ includeArchived });
    res.json(methods);
  } catch (error) {
    handleError(res, error, "Failed to fetch payment methods");
  }
};

export const getMethod = async (req, res) => {
  try {
    const method = await paymentMethodService.getById(req.params.id);
    if (!method) return res.status(404).json({ error: "Payment method not found" });
    res.json(method);
  } catch (error) {
    handleError(res, error, "Failed to fetch payment method");
  }
};

export const createMethod = async (req, res) => {
  try {
    const data = paymentMethodSchema.parse(req.body);
    const method = await paymentMethodService.create(data);
    res.status(201).json(method);
  } catch (error) {
    handleError(res, error, "Failed to create payment method");
  }
};

export const updateMethod = async (req, res) => {
  try {
    const data = paymentMethodSchema.partial().parse(req.body);
    const method = await paymentMethodService.update(req.params.id, data);
    res.json(method);
  } catch (error) {
    handleError(res, error, "Failed to update payment method");
  }
};

export const archiveMethod = async (req, res) => {
  try {
    const method = await paymentMethodService.setArchived(req.params.id, true);
    res.json(method);
  } catch (error) {
    handleError(res, error, "Failed to archive payment method");
  }
};

export const unarchiveMethod = async (req, res) => {
  try {
    const method = await paymentMethodService.setArchived(req.params.id, false);
    res.json(method);
  } catch (error) {
    handleError(res, error, "Failed to unarchive payment method");
  }
};

export const listTransfers = async (req, res) => {
  try {
    const { from, to } = req.query;
    const transfers = await paymentMethodService.listTransfers({ from, to });
    res.json(transfers);
  } catch (error) {
    handleError(res, error, "Failed to fetch transfers");
  }
};

export const createTransfer = async (req, res) => {
  try {
    const data = paymentTransferSchema.parse(req.body);
    const transfer = await paymentMethodService.createTransfer(data);
    res.status(201).json(transfer);
  } catch (error) {
    handleError(res, error, "Failed to create transfer");
  }
};

export const deleteTransfer = async (req, res) => {
  try {
    await paymentMethodService.deleteTransfer(req.params.id);
    res.status(204).send();
  } catch (error) {
    handleError(res, error, "Failed to delete transfer");
  }
};
