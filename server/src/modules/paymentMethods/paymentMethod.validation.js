import { z } from "zod";

export const paymentMethodSchema = z.object({
  name: z.string().min(1, "Name is required").max(60, "Name is too long").transform((s) => s.trim()),
  openingBalance: z.number().default(0),
});

export const paymentTransferSchema = z.object({
  fromMethodId: z.string().uuid("Invalid 'from' method id"),
  toMethodId: z.string().uuid("Invalid 'to' method id"),
  amount: z.number().positive("Amount must be greater than zero"),
  date: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.date().optional()),
  note: z.string().optional().nullable(),
}).refine((d) => d.fromMethodId !== d.toMethodId, {
  message: "Source and destination must be different methods",
  path: ["toMethodId"],
});
