import { z } from "zod";

export const expenseHeadSchema = z.object({
  name: z.string().min(1, "Name is required").max(60, "Name is too long").transform((s) => s.trim()),
  description: z.string().optional().nullable(),
});

export const expenseSchema = z.object({
  headId: z.string().uuid("Invalid expense head"),
  date: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.date().optional()),
  amount: z.number().positive("Amount must be greater than zero"),
  detail: z.string().optional().nullable(),
  paymentMethod: z.string().min(1, "Payment method is required").max(60),
});
