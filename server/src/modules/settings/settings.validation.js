import { z } from 'zod';

// All fields optional so the PATCH endpoint can accept partial updates from
// any of the Settings tabs without forcing the client to round-trip the
// entire object.
export const updateSettingsSchema = z.object({
  schoolName: z.string().trim().min(1).max(120).optional(),
  schoolPhone: z.string().trim().max(40).nullable().optional(),
  schoolEmail: z.string().trim().toLowerCase().email().nullable().optional().or(z.literal('')),
  schoolAddress: z.string().trim().max(400).nullable().optional(),
  voucherHeader: z.string().trim().max(400).nullable().optional(),
  voucherFooter: z.string().trim().max(400).nullable().optional(),

  voucherPrefix: z.string().trim().min(1).max(10).optional(),
  voucherPadding: z.number().int().min(2).max(10).optional(),
  voucherResetCadence: z.enum(['YEARLY', 'MONTHLY', 'NEVER']).optional(),

  regNumberPrefix: z.string().trim().max(10).nullable().optional(),
  regNumberPadding: z.number().int().min(0).max(10).optional(),
  rollNumberPrefix: z.string().trim().max(10).nullable().optional(),
  rollNumberPadding: z.number().int().min(0).max(10).optional(),

  graceDays: z.number().int().min(0).max(60).optional(),
  defaultLateFinePerDay: z.number().nonnegative().max(10000).optional(),
  absenceWorkingDaysDivisor: z.number().int().min(1).max(31).optional(),

  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY']).optional(),

  notificationsEmailEnabled: z.boolean().optional(),
  notificationsSmsEnabled: z.boolean().optional(),
  notificationsWhatsappEnabled: z.boolean().optional(),
  notificationsEmailFrom: z.string().trim().max(120).nullable().optional(),
  notificationsSmsFrom: z.string().trim().max(40).nullable().optional(),
  notificationsWhatsappFrom: z.string().trim().max(40).nullable().optional(),
});

export const restartSequenceSchema = z.object({
  startFrom: z.number().int().min(1).max(2_000_000_000),
});

export const settingsValidation = {
  updateSettingsSchema,
  restartSequenceSchema,
};
