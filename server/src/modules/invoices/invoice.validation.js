import { z } from "zod";

const invoiceItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().nonnegative(),
  total: z.coerce.number().nonnegative(),
});

export const invoiceSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.coerce.date(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
  subtotal: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative().default(0),
  grandTotal: z.coerce.number().nonnegative(),
  notes: z.string().optional().nullable(),
  paymentMethod: z.string().min(1, "Payment method is required").max(60),
});