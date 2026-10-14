import { z } from "zod";

export const feeStructureSchema = z.object({
  name: z.string().optional(),
  className: z.string().optional(),
  late: z.number().nonnegative("Late fee must be 0 or more").optional(),
  tuition: z.number().nonnegative("Tuition fee must be 0 or more"),
  exam: z.number().nonnegative("Exam fee must be 0 or more"),
  transport: z.number().nonnegative("Transport fee must be 0 or more"),
  schoolFee: z.number().nonnegative("School fee must be 0 or more").optional().default(0),
  admissionFee: z.number().nonnegative("Admission fee must be 0 or more").optional().default(0),
  annualFund: z.number().nonnegative("Annual fund must be 0 or more").optional().default(0),
  courseFee: z.number().nonnegative("Course fee must be 0 or more").optional().default(0),
  fees: z.record(z.string(), z.number().nonnegative("Amount must be 0 or more")),
});