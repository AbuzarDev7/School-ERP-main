import { z } from "zod";

export const productSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  productNumber: z.number().optional(),
  category: z.enum(["Uniform", "Books", "Stationary", "Sports", "Other"]).optional().nullable(),
  sku: z.number().optional().nullable(),
  unitPrice: z.number().nonnegative("Price must be a positive number"),
  stockQuantity: z.number().nonnegative().default(0),
  description: z.string().optional().nullable(),
});

export const updateStatusSchema = z.object({
  productName: z.string().optional(),
  productNumber: z.number().optional(),
  category: z.enum(["Uniform", "Books", "Stationary", "Sports", "Other"]).optional(),
  sku: z.number().optional().nullable(),
  unitPrice: z.number().nonnegative().optional(),
  stockQuantity: z.number().nonnegative().optional(),
  description: z.string().optional().nullable(),
});