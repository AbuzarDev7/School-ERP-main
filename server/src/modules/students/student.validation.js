// student.validation.js
import { z } from "zod"

export const studentSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  regNumber: z.coerce.number().optional(),
  rollNumber: z.coerce.number().optional(),
  dob: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.date().optional()),
  admissionDate: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.date().optional()),
  status: z.enum(["ACTIVE", "INACTIVE", "GRADUATED", "WITHDRAWN", "DISCHARGED", "RUSTICATED", "ARCHIVED"]).optional(),

  class: z.string().min(1, "Class is required"),

  fathersName: z.string().min(1, "Father's name is required"),
  fathersCnic: z.string().regex(/^\d{5}-\d{7}-\d{1}$/, "CNIC must follow xxxxx-xxxxxxx-x format").optional().or(z.literal('')),
  guardianName: z.string().optional(),
  guardianOccupation: z.string().optional(),

  phone: z.string().regex(/^\d{4}-\d{7}$/, "Phone must follow 0300-1234567 format"),
  emergencyNumber: z.string().regex(/^\d{4}-\d{7}$/, "Emergency number must follow 0300-1234567 format").optional().or(z.literal('')),
  email: z.string().trim().toLowerCase().email("Invalid email address").optional().or(z.literal('')).nullable(),
  address: z.string().optional(),
  previousSchool: z.string().optional(),
  lastSession: z.string().optional(),

  photo: z.string().nullable().optional(),
  birthCertificate: z.string().nullable().optional(),
  fatherCnicFile: z.string().nullable().optional(),
  leavingCertificate: z.string().nullable().optional(),
  tuitionDiscount: z.coerce.number().optional().default(0),
  examDiscount: z.coerce.number().optional().default(0),
  transportDiscount: z.coerce.number().optional().default(0),
})