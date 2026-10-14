// server/src/modules/auth/auth.service.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma.js';
import { supabaseService } from '../../config/supabase.service.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required. Set it in .env before starting the server.");
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
// Long-lived TTL used when the user ticks "Remember me" on the sign-in form.
// 30 days strikes the usual balance: long enough for "stay logged in" to feel
// real on a personal device, short enough that an abandoned session
// eventually self-revokes.
const JWT_REMEMBER_ME_EXPIRES_IN = process.env.JWT_REMEMBER_ME_EXPIRES_IN || '30d';

// Convert the same TTL we hand to jsonwebtoken into a concrete Date for the
// Session row. Supports the common "1h", "7d", "30m" forms. Anything else
// falls back to 1 hour to match jsonwebtoken's default behavior.
const expiresInToDate = (spec) => {
  const m = String(spec).trim().match(/^(\d+)\s*(s|m|h|d)?$/i);
  if (!m) return new Date(Date.now() + 60 * 60 * 1000);
  const n = Number(m[1]);
  const unit = (m[2] || 's').toLowerCase();
  const ms =
    unit === 's' ? n * 1000 :
    unit === 'm' ? n * 60 * 1000 :
    unit === 'h' ? n * 60 * 60 * 1000 :
    /* d */        n * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
};

export const authService = {
  registerUser: async (userData) => {
    const { email, password, name, role } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'STUDENT', // Default to STUDENT if not provided
      },
      select: { id: true, email: true, name: true, role: true }, // Don't return password
    });

    return user;
  },

  loginUser: async (credentials, { userAgent, ipAddress } = {}) => {
    const { email, password, rememberMe } = credentials;

    if (typeof password !== 'string' || password.length === 0) {
      throw new Error('Password must be a non-empty string');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Pick TTL based on the rememberMe flag. The same spec is used to sign
    // the JWT and to compute the Session row's expiresAt so both layers stay
    // in sync — otherwise the middleware could revoke an otherwise-valid JWT.
    const ttl = rememberMe ? JWT_REMEMBER_ME_EXPIRES_IN : JWT_EXPIRES_IN;
    const expiresAt = expiresInToDate(ttl);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
        ipAddress: ipAddress ? String(ipAddress).slice(0, 64) : null,
        expiresAt,
      },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role, sessionId: session.id },
      JWT_SECRET,
      { expiresIn: ttl }
    );

    // Stamp lastLoginAt for the Settings "Last sign-in" line. Best-effort —
    // failure shouldn't block login.
    prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch((e) => console.error('[auth.lastLoginAt]', e?.message));

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        lastLoginAt: user.lastLoginAt,
        allowedModules: user.allowedModules || [],
      },
    };
  },

  // ---- Sessions ----

  listSessions: async (userId, currentSessionId) => {
    // Hide already-revoked rows; client only cares about live sessions.
    const rows = await prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, userAgent: true, ipAddress: true, lastUsedAt: true, createdAt: true, expiresAt: true },
    });
    return rows.map((s) => ({ ...s, isCurrent: s.id === currentSessionId }));
  },

  // Per-row revoke. Caller (controller) ensures the user only revokes their
  // own sessions.
  revokeSession: async (userId, sessionId) => {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      const err = new Error('Session not found');
      err.statusCode = 404;
      throw err;
    }
    if (session.revokedAt) return session;
    return prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  },

  // "Sign out other devices" — keeps the current session alive so the user
  // doesn't get bounced from the Settings screen they just clicked from.
  revokeOtherSessions: async (userId, currentSessionId) => {
    const result = await prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
    return { revokedCount: result.count };
  },

  updateProfile: async (userId, { name, email }) => {
    // Catch the email collision before letting Prisma throw P2002 — gives a
    // clearer error and avoids a wasted round-trip when the user is just
    // updating their name.
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      const err = new Error("This email is already in use by another account");
      err.statusCode = 409;
      throw err;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, lastLoginAt: true, allowedModules: true },
    });

    return user;
  },

  // Pulls the full safe profile (no password) — used by the Settings screen
  // when it loads, so the client always has lastLoginAt + avatarUrl even
  // when the cached user object from the login response is stale.
  getProfile: async (userId) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, lastLoginAt: true, allowedModules: true },
    });
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return user;
  },

  uploadAvatar: async (userId, file) => {
    if (!file) {
      const err = new Error('No file uploaded');
      err.statusCode = 400;
      throw err;
    }

    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    if (current.avatarUrl) {
      // Best-effort cleanup — don't block the new upload on bucket errors.
      await supabaseService.deleteFile(current.avatarUrl).catch(() => {});
    }

    const url = await supabaseService.uploadFile(file, 'school-assets', 'avatars');
    return prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, lastLoginAt: true, allowedModules: true },
    });
  },

  removeAvatar: async (userId) => {
    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    if (current.avatarUrl) {
      await supabaseService.deleteFile(current.avatarUrl).catch(() => {});
    }
    return prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, lastLoginAt: true, allowedModules: true },
    });
  },

  changePassword: async (userId, { oldPassword, newPassword }) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      const err = new Error("Current password is incorrect");
      err.statusCode = 401;
      throw err;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { success: true };
  },
};