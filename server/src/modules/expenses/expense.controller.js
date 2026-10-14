import { z } from "zod";
import { expenseHeadService, expenseService } from "./expense.service.js";
import { expenseHeadSchema, expenseSchema } from "./expense.validation.js";
import { sendError } from "../../utils/sendError.js";

function handleError(res, error) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: "Validation failed", details: error.errors });
  }
  return sendError(res, error);
}

// ── Heads ──────────────────────────────────────────────

export const listHeads = async (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === "true";
    const heads = await expenseHeadService.list({ includeArchived });
    res.json(heads);
  } catch (err) {
    handleError(res, err, "Failed to fetch expense heads");
  }
};

export const createHead = async (req, res) => {
  try {
    const data = expenseHeadSchema.parse(req.body);
    const head = await expenseHeadService.create(data);
    res.status(201).json(head);
  } catch (err) {
    handleError(res, err, "Failed to create expense head");
  }
};

export const updateHead = async (req, res) => {
  try {
    const data = expenseHeadSchema.partial().parse(req.body);
    const head = await expenseHeadService.update(req.params.id, data);
    res.json(head);
  } catch (err) {
    handleError(res, err, "Failed to update expense head");
  }
};

export const archiveHead = async (req, res) => {
  try {
    const head = await expenseHeadService.setArchived(req.params.id, true);
    res.json(head);
  } catch (err) {
    handleError(res, err, "Failed to archive expense head");
  }
};

export const unarchiveHead = async (req, res) => {
  try {
    const head = await expenseHeadService.setArchived(req.params.id, false);
    res.json(head);
  } catch (err) {
    handleError(res, err, "Failed to restore expense head");
  }
};

export const deleteHead = async (req, res) => {
  try {
    await expenseHeadService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    handleError(res, err, "Failed to delete expense head");
  }
};

// ── Expenses ───────────────────────────────────────────

export const listExpenses = async (req, res) => {
  try {
    const { from, to, headId } = req.query;
    const expenses = await expenseService.list({ from, to, headId });
    res.json(expenses);
  } catch (err) {
    handleError(res, err, "Failed to fetch expenses");
  }
};

export const createExpense = async (req, res) => {
  try {
    const data = expenseSchema.parse(req.body);
    const expense = await expenseService.create(data);
    res.status(201).json(expense);
  } catch (err) {
    handleError(res, err, "Failed to record expense");
  }
};

export const updateExpense = async (req, res) => {
  try {
    const data = expenseSchema.parse(req.body);
    const expense = await expenseService.update(req.params.id, data);
    res.json(expense);
  } catch (err) {
    handleError(res, err, "Failed to update expense");
  }
};

export const deleteExpense = async (req, res) => {
  try {
    await expenseService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    handleError(res, err, "Failed to delete expense");
  }
};
