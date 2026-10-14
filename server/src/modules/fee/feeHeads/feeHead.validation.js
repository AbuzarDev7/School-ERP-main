import { z } from "zod";

export const feeHeadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  amount: z.number().nonnegative("Amount must be 0 or more"),
  isRecurring: z.boolean().default(true),
});