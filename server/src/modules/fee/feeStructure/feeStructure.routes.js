import express from "express";
import {
  createStructure,
  getStructures,
  updateStructure,
  deleteStructure,
} from "./feeStructure.controller.js";

const router = express.Router();

router.post("/", createStructure);
router.get("/", getStructures);
router.put("/:id", updateStructure);
router.delete("/:id", deleteStructure);

export default router;