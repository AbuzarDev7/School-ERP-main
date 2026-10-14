import { productService } from "./product.service.js";
import { updateStatusSchema, productSchema } from "./product.validation.js";
import { z } from "zod";

export const createProduct = async (req, res) => {
  try {
    const parsed = productSchema.parse(req.body);
    const product = await productService.create(parsed);
    res.status(201).json(product);
  } catch (err) {
    const message = err instanceof z.ZodError ? "Invalid inventory data" : err.message;
    res.status(400).json({ error: message });
  }
};

export const getProducts = async (req, res) => {
  try {
    const data = await productService.getAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createBulkProducts = async (req, res) => {
  try {
    const { products } = req.body; 
    if (!Array.isArray(products)) throw new Error("Expected an array of products");

    const validatedData = products.map(v => productSchema.parse(v));
    const createdproducts = await productService.createBulk(validatedData);
    res.status(201).json(createdproducts);
  } catch (err) {
    const message = err instanceof z.ZodError ? "Bulk validation failed" : err.message;
    res.status(400).json({ error: message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateStatusSchema.parse(req.body);

    const updated = await productService.update(id, validatedData);

    res.json(updated);
  } catch (err) {
    const message = err instanceof z.ZodError ? "Update validation failed" : err.message;
    res.status(400).json({ error: message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await productService.delete(req.params.id);
    res.json({ message: "product deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};