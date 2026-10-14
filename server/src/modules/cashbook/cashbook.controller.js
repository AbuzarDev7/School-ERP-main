import { cashbookService } from "./cashbook.service.js";
import { cashbookSchema, cashbookUpdateSchema } from "./cashbook.validation.js";
import { sendError } from "../../utils/sendError.js";
import { z } from "zod";

export const createCashbookEntry = async (req, res) => {
  try {
    const validatedData = cashbookSchema.parse(req.body);
    const entry = await cashbookService.createEntry(validatedData);
    res.status(201).json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    sendError(res, error);
  }
};

export const getAllCashbookEntries = async (req, res) => {
  try {
    const filters = req.query;
    const entries = await cashbookService.getAllEntries(filters);
    res.json(entries);
  } catch (error) {
    sendError(res, error);
  }
};

export const getCashbookEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await cashbookService.getEntryById(id);
    if (!entry) {
      return res.status(404).json({ error: "Cashbook entry not found" });
    }
    res.json(entry);
  } catch (error) {
    sendError(res, error);
  }
};

export const updateCashbookEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = cashbookUpdateSchema.parse(req.body);
    const updatedEntry = await cashbookService.updateEntry(id, validatedData);
    res.json(updatedEntry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    sendError(res, error);
  }
};

export const deleteCashbookEntry = async (req, res) => {
  try {
    const { id } = req.params;
    await cashbookService.deleteEntry(id);
    res.status(204).send();
  } catch (error) {
    sendError(res, error);
  }
};