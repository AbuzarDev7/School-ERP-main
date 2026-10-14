// server/src/modules/auth/auth.validation.js
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  name: z.string().min(2, "Name must be at least 2 characters long"),
  // Role is optional, defaults to 'STUDENT' in the model
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"), // Password length check is usually done on registration
  // When true, the JWT + session row get a longer TTL (default 30 days) so
  // the user stays signed in across browser restarts. Defaults to false.
  rememberMe: z.boolean().optional().default(false),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters long"),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "New password and confirmation do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.oldPassword !== d.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export const authValidation = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
};