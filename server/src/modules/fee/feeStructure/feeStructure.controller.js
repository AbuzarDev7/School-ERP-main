import { feeStructureService } from "./feeStructure.service.js";
import { feeStructureSchema } from "./feeStructure.validation.js";
import { z } from "zod";

export const createStructure = async (req, res) => {
  try {
    const parsed = feeStructureSchema.parse(req.body);
    const result = await feeStructureService.create(parsed);
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof z.ZodError ? "Invalid data provided" : err.message;
    res.status(400).json({ error: message });
  }
};

export const getStructures = async (req, res) => {
  try {
    const data = await feeStructureService.getAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateStructure = async (req, res) => {
  try {
    const parsed = feeStructureSchema.parse(req.body);
    const result = await feeStructureService.update(req.params.id, parsed);
    res.json(result);
  } catch (err) {
    const status = err instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
};

export const deleteStructure = async (req, res) => {
  try {
    await feeStructureService.delete(req.params.id);
    res.json({ success: true, message: "Structure deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};