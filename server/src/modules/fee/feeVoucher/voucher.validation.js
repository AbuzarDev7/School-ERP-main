import { z } from "zod";

export const voucherSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  month: z.string().min(1, "Month is required"),
  // dueDate: z.string().or(z.date()),
  dueDate: z.coerce.date(),
  amount: z.number().nonnegative(),
  arrears: z.number().default(0),
  fine: z.number().default(0),
  discount: z.number().default(0),
  totalPayable: z.number().nonnegative(),
  paidAmount: z.number().nonnegative().optional(),

  tuitionDiscount: z.number().default(0),
  examDiscount: z.number().default(0),
  transportDiscount: z.number().default(0),
  status: z.enum(["UNPAID", "PAID", "PARTIAL"]).default("UNPAID"),
  // FIX: These must be optional/nullable for the POST request to pass
  paymentMethod: z.string().optional().nullable(),
  transactionId: z.string().optional().nullable(),
});

// Partial-edit schema for the cashier "Edit Voucher" flow. Only fires before
// any payment has been collected; the service rejects the call once paidAmount
// has moved off zero, so we don't need to enforce that here. totalPayable is
// recomputed server-side from amount + arrears + fine - discount, so we don't
// accept it as input.
export const editVoucherSchema = z.object({
  dueDate: z.coerce.date().optional(),
  amount: z.number().nonnegative().optional(),
  arrears: z.number().nonnegative().optional(),
  fine: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  tuitionDiscount: z.number().nonnegative().optional(),
  examDiscount: z.number().nonnegative().optional(),
  transportDiscount: z.number().nonnegative().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(["UNPAID", "PAID", "PARTIAL"]),
  paymentMethod: z.string().min(1, "Payment method is required"),
  transactionId: z.string().optional().or(z.literal("")),
  fine: z.number().nonnegative().optional(),
  totalPayable: z.number().nonnegative().optional(),
  paidAmount: z.number().nonnegative().optional(),
  // Optimistic concurrency token — the paidAmount the client *thought* the
  // voucher had when the cashier opened the modal. Server rejects with 409
  // if the real value has moved on. Closes the two-cashier race that
  // would otherwise let both record the same collection.
  expectedPaidAmount: z.number().nonnegative().optional(),
});