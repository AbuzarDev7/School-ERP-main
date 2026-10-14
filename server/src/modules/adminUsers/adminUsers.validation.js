import { z } from 'zod';

export const inviteUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).default('TEACHER'),
  allowedModules: z.array(z.string()).optional(),
  customRoleId: z.string().uuid().nullable().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
  allowedModules: z.array(z.string()).optional(),
  customRoleId: z.string().uuid().nullable().optional(),
});

export const adminUsersValidation = { inviteUserSchema, updateUserSchema };
