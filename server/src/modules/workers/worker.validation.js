import { z } from "zod";

export const workerSchema = z.object({
  name: z.string().min(1, "Worker name is required"),
  phone: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  profilePicture: z.string().optional().nullable(),
  monthlySalary: z.number().nonnegative("Monthly salary must be a non-negative number"),
  hourlyOvertimeRate: z.number().nonnegative("Hourly overtime rate must be a non-negative number"),
  standardWorkingDays: z.number().int().positive("Standard working days must be a positive integer").optional().default(26),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});

export const workerAdvanceSchema = z.object({
  workerId: z.string().uuid("Invalid worker ID format"),
  amount: z.number().positive("Advance amount must be positive"),
  date: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.date().optional()),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  notes: z.string().optional().nullable(),
  method: z.string().min(1, "Payment method is required").default("Cash"),
});

export const workerExtraHoursSchema = z.object({
  workerId: z.string().uuid("Invalid worker ID format"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  hours: z.number().nonnegative("Extra hours must be non-negative"),
  ratePerHour: z.number().nonnegative("Rate per hour must be non-negative"),
  amount: z.number().nonnegative("Amount must be non-negative"), // Should be hours * ratePerHour
  paymentId: z.string().uuid().optional().nullable(),
});

export const workerPaymentSchema = z.object({
  workerId: z.string().uuid("Invalid worker ID format"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  totalSalary: z.number().nonnegative("Total salary must be non-negative"),
  advanceTotal: z.number().nonnegative("Advance total must be non-negative"),
  overtimeHours: z.number().nonnegative("Overtime hours must be non-negative"),
  overtimeAmount: z.number().nonnegative("Overtime amount must be non-negative"),
  absentDays: z.number().nonnegative("Absent days must be non-negative"),
  absenceDeduction: z.number().nonnegative("Absence deduction must be non-negative"),
  netPaid: z.number().nonnegative("Net paid must be non-negative"),
  paidDate: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.date().optional()),
  notes: z.string().optional().nullable(),
  method: z.string().min(1, "Payment method is required").default("Cash"),
});