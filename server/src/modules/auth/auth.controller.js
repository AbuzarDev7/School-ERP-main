// server/src/modules/auth/auth.controller.js
import { authService } from './auth.service.js';
import { authValidation } from './auth.validation.js';
import { activityService } from '../activity/activity.service.js';

// Prisma error codes that mean "we couldn't reach the database" — distinct
// from "credentials are wrong". Surfacing them as 503 lets the operator
// distinguish a typo from a real outage without exposing internals.
const PRISMA_CONNECTION_CODES = new Set([
  'P1001', // Can't reach database server
  'P1002', // Connection timed out
  'P1008', // Operations timed out
  'P1017', // Server closed the connection
  'P2024', // Connection pool timeout
]);

const isConnectionError = (err) =>
  PRISMA_CONNECTION_CODES.has(err?.code) ||
  /can't reach database server/i.test(err?.message || '');

export const authController = {
  register: async (req, res) => {
    try {
      const validatedData = authValidation.registerSchema.parse(req.body);
      const user = await authService.registerUser(validatedData);
      res.status(201).json({ message: 'User registered successfully', user });
    } catch (error) {
      if (error.errors) {
        return res.status(400).json({ errors: error.errors });
      }
      if (isConnectionError(error)) {
        console.error('[auth.register] DB unreachable:', error.message);
        return res.status(503).json({
          message: 'Authentication service is temporarily unavailable. Please try again in a moment.',
        });
      }
      console.error('[auth.register]', error);
      res.status(400).json({ message: 'Registration failed. Please check your details and try again.' });
    }
  },

  login: async (req, res) => {
    try {
      const validatedData = authValidation.loginSchema.parse(req.body);
      const { token, user } = await authService.loginUser(validatedData, {
        userAgent: req.headers['user-agent'],
        // express.set('trust proxy') would be needed for accurate IPs behind
        // Vercel/Cloudflare; req.ip falls back gracefully when not set.
        ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
      });
      activityService.log({
        actorId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        action: 'LOGIN',
        ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
      });
      res.status(200).json({ message: 'Logged in successfully', token, user });
    } catch (error) {
      if (error.errors) {
        return res.status(400).json({ errors: error.errors });
      }
      // Database unreachable → 503 with a clear, non-leaky message.
      if (isConnectionError(error)) {
        console.error('[auth.login] DB unreachable:', error.message);
        return res.status(503).json({
          message: 'Authentication service is temporarily unavailable. Please try again in a moment.',
        });
      }
      // Bad password / unknown email → keep 401 with a generic message so we
      // don't reveal whether the email exists. The service throws
      // "Invalid credentials" already; we just normalize the response shape.
      console.error('[auth.login]', error.message);
      res.status(401).json({ message: 'Invalid credentials' });
    }
  },

  getProfile: async (req, res) => {
    if (!req.user) {
      return res.status(403).json({ message: 'Access denied: No user information' });
    }
    try {
      // Always re-fetch so lastLoginAt / avatarUrl are fresh, not whatever
      // was cached when the JWT was minted.
      const user = await authService.getProfile(req.user.id);
      res.status(200).json({ user });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error('[auth.getProfile]', error);
      res.status(500).json({ message: 'Failed to load profile' });
    }
  },

  uploadAvatar: async (req, res) => {
    try {
      const user = await authService.uploadAvatar(req.user.id, req.file);
      res.status(200).json({ message: 'Avatar updated', user });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error('[auth.uploadAvatar]', error);
      res.status(500).json({ message: 'Failed to upload avatar' });
    }
  },

  listSessions: async (req, res) => {
    try {
      const sessions = await authService.listSessions(req.user.id, req.session?.id);
      res.status(200).json({ sessions });
    } catch (error) {
      console.error('[auth.listSessions]', error);
      res.status(500).json({ message: 'Failed to load sessions' });
    }
  },

  revokeSession: async (req, res) => {
    try {
      await authService.revokeSession(req.user.id, req.params.id);
      res.status(200).json({ message: 'Session signed out' });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error('[auth.revokeSession]', error);
      res.status(500).json({ message: 'Failed to revoke session' });
    }
  },

  revokeOtherSessions: async (req, res) => {
    try {
      const { revokedCount } = await authService.revokeOtherSessions(req.user.id, req.session?.id);
      res.status(200).json({ message: `Signed out ${revokedCount} other device(s)`, revokedCount });
    } catch (error) {
      console.error('[auth.revokeOtherSessions]', error);
      res.status(500).json({ message: 'Failed to sign out other devices' });
    }
  },

  // Server-side counterpart to the client's logout — invalidates the current
  // session so the JWT can't be reused even if it's leaked.
  logout: async (req, res) => {
    try {
      if (req.session?.id) {
        await authService.revokeSession(req.user.id, req.session.id);
      }
      activityService.log({
        actorId: req.user?.id,
        actorName: req.user?.name,
        actorEmail: req.user?.email,
        action: 'LOGOUT',
        ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
      });
      res.status(200).json({ message: 'Signed out' });
    } catch (error) {
      // Log but don't fail — the client clears its token anyway.
      console.error('[auth.logout]', error);
      res.status(200).json({ message: 'Signed out' });
    }
  },

  removeAvatar: async (req, res) => {
    try {
      const user = await authService.removeAvatar(req.user.id);
      res.status(200).json({ message: 'Avatar removed', user });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error('[auth.removeAvatar]', error);
      res.status(500).json({ message: 'Failed to remove avatar' });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const validated = authValidation.updateProfileSchema.parse(req.body);
      const user = await authService.updateProfile(req.user.id, validated);
      res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
      if (error.errors) {
        return res.status(400).json({ errors: error.errors });
      }
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error('[auth.updateProfile]', error);
      res.status(500).json({ message: 'Failed to update profile. Please try again.' });
    }
  },

  changePassword: async (req, res) => {
    try {
      const validated = authValidation.changePasswordSchema.parse(req.body);
      await authService.changePassword(req.user.id, validated);
      res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      if (error.errors) {
        return res.status(400).json({ errors: error.errors });
      }
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      console.error('[auth.changePassword]', error);
      res.status(500).json({ message: 'Failed to change password. Please try again.' });
    }
  },
};
