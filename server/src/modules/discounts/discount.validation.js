import { z } from "zod";

export const discountSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  amount: z.number().positive("Amount must be greater than 0"),
  isRecurring: z.boolean().default(true),
});