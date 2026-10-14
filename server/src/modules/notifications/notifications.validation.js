import { z } from 'zod';

export const updateTemplateSchema = z.object({
  subject: z.string().max(200).nullable().optional(),
  body: z.string().min(1, 'Body cannot be empty').max(4000),
  enabled: z.boolean().optional(),
});

export const sendTestSchema = z.object({
  event: z.enum(['VOUCHER_CREATED', 'PAYMENT_RECEIVED', 'DUES_REMINDER']),
  channel: z.enum(['EMAIL', 'SMS', 'WHATSAPP']),
  recipient: z.string().min(1, 'Recipient is required').max(200),
});

export const notificationsValidation = { updateTemplateSchema, sendTestSchema };
