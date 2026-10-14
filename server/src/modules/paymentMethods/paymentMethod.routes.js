import { Router } from "express";
import {
  listMethods,
  getMethod,
  createMethod,
  updateMethod,
  archiveMethod,
  unarchiveMethod,
  listTransfers,
  createTransfer,
  deleteTransfer,
} from "./paymentMethod.controller.js";

const router = Router();

router.route("/transfers").get(listTransfers).post(createTransfer);
router.route("/transfers/:id").delete(deleteTransfer);

router.route("/").get(listMethods).post(createMethod);
router.route("/:id").get(getMethod).put(updateMethod);
router.route("/:id/archive").put(archiveMethod);
router.route("/:id/unarchive").put(unarchiveMethod);

export default router;
