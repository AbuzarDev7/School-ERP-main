import express from "express";
import {
  createDiscount,
  getDiscounts,
  getDiscount,
  updateDiscount,
  deleteDiscount,
} from "./discount.controller.js";

const router = express.Router();

router.post("/", createDiscount);
router.get("/", getDiscounts);
router.get("/:id", getDiscount);
router.put("/:id", updateDiscount);
router.delete("/:id", deleteDiscount);

export default router;