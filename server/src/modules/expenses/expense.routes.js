import { Router } from "express";
import {
  listHeads,
  createHead,
  updateHead,
  archiveHead,
  unarchiveHead,
  deleteHead,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "./expense.controller.js";

const router = Router();

// Heads
router.route("/heads").get(listHeads).post(createHead);
router.route("/heads/:id").put(updateHead).delete(deleteHead);
router.route("/heads/:id/archive").put(archiveHead);
router.route("/heads/:id/unarchive").put(unarchiveHead);

// Expenses
router.route("/").get(listExpenses).post(createExpense);
router.route("/:id").put(updateExpense).delete(deleteExpense);

export default router;
