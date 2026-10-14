import express from "express";
import {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  createBulkProducts,
} from "./product.controller.js";


const router = express.Router();

// @route   GET /api/products
// @desc    Get all products
router.get("/", getProducts);

// @route   POST /api/products
// @desc    Create a new product
router.post("/", createProduct);

// @route   POST /api/products/bulk
// @desc    Create multiple products in bulk
router.post("/bulk", createBulkProducts);

// @route   PUT /api/products/:id
// @desc    Update a product
router.put("/:id", updateProduct);

// @route   DELETE /api/products/:id
// @desc    Delete a product
router.delete("/:id", deleteProduct);

export default router;