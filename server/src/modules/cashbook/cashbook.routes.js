import { Router } from "express";
import {
  createCashbookEntry,
  getAllCashbookEntries,
  getCashbookEntryById,
  updateCashbookEntry,
  deleteCashbookEntry,
} from "./cashbook.controller.js";

const router = Router();

router.route("/").post(createCashbookEntry).get(getAllCashbookEntries);
router.route("/:id").get(getCashbookEntryById).put(updateCashbookEntry).delete(deleteCashbookEntry);

export default router;