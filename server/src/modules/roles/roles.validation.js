import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).optional().nullable(),
  permissionIds: z.array(z.string().uuid()).default([]),
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(200).nullable().optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export const rolesValidation = { createRoleSchema, updateRoleSchema };
