import { discountService } from "./discount.service.js";
import { discountSchema } from "./discount.validation.js";
import { z } from "zod";
  
export const createDiscount = async (req, res) => {
  try {
    const parsed = discountSchema.parse(req.body);
    const discount = await discountService.create(parsed);
    res.status(201).json(discount);
  } catch (err) {
    const message = err instanceof z.ZodError ? "Invalid data provided" : err.message;
    res.status(400).json({ error: message });
  }
};

export const getDiscounts = async (req, res) => {
  try {
    const discounts = await discountService.getAll();
    res.json(discounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getDiscount = async (req, res) => {
  const discount = await discountService.getById(req.params.id);
  if (!discount) return res.status(404).json({ error: "Discount not found" });
  res.json(discount);
};

export const updateDiscount = async (req, res) => {
  try {
    const parsed = discountSchema.parse(req.body);
    const discount = await discountService.update(req.params.id, parsed);
    res.json(discount);
  } catch (err) {
    const message = err instanceof z.ZodError ? "Invalid data provided" : err.message;
    res.status(400).json({ error: message });
  }
};

export const deleteDiscount = async (req, res) => {
  try {
    await discountService.delete(req.params.id);
    res.json({ success: true, message: "Discount deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};