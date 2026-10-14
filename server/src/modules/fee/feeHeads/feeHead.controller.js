import { feeHeadService } from "./feeHead.service.js";
import { feeHeadSchema } from "./feeHead.validation.js";

export const createFeeHead = async (req, res) => {
  try {
    const parsed = feeHeadSchema.parse(req.body);
    const feeHead = await feeHeadService.create(parsed);
    res.status(201).json(feeHead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getFeeHeads = async (req, res) => {
  try {
    const heads = await feeHeadService.getAll();
    res.json(heads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getFeeHead = async (req, res) => {
  const feeHead = await feeHeadService.getById(req.params.id);
  if (!feeHead) return res.status(404).json({ error: "Fee Head not found" });
  res.json(feeHead);
};

export const updateFeeHead = async (req, res) => {
  try {
    const parsed = feeHeadSchema.parse(req.body);
    const feeHead = await feeHeadService.update(req.params.id, parsed);
    res.json(feeHead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteFeeHead = async (req, res) => {
  try {
    await feeHeadService.delete(req.params.id);
    res.json({ success: true, message: "Fee Head deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};