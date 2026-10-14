import { z } from "zod";

export const cashbookSchema = z.object({
  type: z.enum(["in", "out"], "Cashbook entry type must be 'in' or 'out'"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be a positive number"),
  date: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.date().optional()),
  method: z.string().min(1, "Payment method is required").max(60, "Payment method name is too long"),
});

export const cashbookUpdateSchema = cashbookSchema.partial();