import express from "express";
import {
  createFeeHead,
  getFeeHeads,
  getFeeHead,
  updateFeeHead,
  deleteFeeHead,
} from "./feeHead.controller.js";

const router = express.Router();

router.post("/", createFeeHead);
router.get("/", getFeeHeads);
router.get("/:id", getFeeHead);
router.put("/:id", updateFeeHead);
router.delete("/:id", deleteFeeHead);

export default router;