import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../config/prisma.js';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatarUrl: true,
  lastLoginAt: true,
  allowedModules: true,
  customRoleId: true,
  customRole: { select: { id: true, name: true, isSystem: true } },
  createdAt: true,
};

// Friendly random passwords — readable enough for the admin to dictate
// over the phone, strong enough for a temporary credential. 14 chars from
// a 60-char alphabet (no ambiguous 0/O/1/l) gives ~82 bits of entropy.
const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const generateTempPassword = (length = 14) => {
  let out = '';
  const buf = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    out += PASSWORD_ALPHABET[buf[i] % PASSWORD_ALPHABET.length];
  }
  return out;
};

export const adminUsersService = {
  list: async () => {
    return prisma.user.findMany({
      select: SAFE_USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  },

  invite: async ({ name, email, password, role, allowedModules, customRoleId }) => {
    if (role === 'ADMIN') {
      const err = new Error('Only one Admin is allowed. New users can only be Staff.');
      err.statusCode = 400;
      throw err;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      const err = new Error('A user with this email already exists');
      err.statusCode = 409;
      throw err;
    }

    const rawPassword = password || generateTempPassword();
    const hashed = await bcrypt.hash(rawPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashed,
        name: name.trim(),
        role: 'TEACHER',
        allowedModules: allowedModules || [],
        customRoleId: customRoleId || null,
      },
      select: SAFE_USER_SELECT,
    });

    return { user, tempPassword: rawPassword };
  },

  update: async (id, { name, email, role, allowedModules, customRoleId }) => {
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (email !== undefined) {
      const normalized = String(email).trim().toLowerCase();
      const collision = await prisma.user.findUnique({ where: { email: normalized } });
      if (collision && collision.id !== id) {
        const err = new Error('Email already in use');
        err.statusCode = 409;
        throw err;
      }
      data.email = normalized;
    }
    if (role !== undefined) {
      const current = await prisma.user.findUnique({ where: { id } });
      if (current?.role === 'ADMIN' && role !== 'ADMIN') {
        const err = new Error('Cannot change the Admin role');
        err.statusCode = 400;
        throw err;
      }
      if (current?.role !== 'ADMIN' && role === 'ADMIN') {
        const err = new Error('Cannot promote a user to Admin');
        err.statusCode = 400;
        throw err;
      }
      data.role = role;
    }
    if (allowedModules !== undefined) data.allowedModules = allowedModules;
    if (customRoleId !== undefined) data.customRoleId = customRoleId || null;

    return prisma.user.update({
      where: { id },
      data,
      select: SAFE_USER_SELECT,
    });
  },

  resetPassword: async (id) => {
    const tempPassword = generateTempPassword();
    const hashed = await bcrypt.hash(tempPassword, 10);
    const user = await prisma.user.update({
      where: { id },
      data: { password: hashed },
      select: SAFE_USER_SELECT,
    });
    // Revoke any active sessions so the old password (and any stolen tokens)
    // immediately stop working.
    await prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { user, tempPassword };
  },

  remove: async (id, { actorId } = {}) => {
    if (id === actorId) {
      const err = new Error('You cannot delete your own account');
      err.statusCode = 400;
      throw err;
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    if (user.role === 'ADMIN') {
      const otherAdmins = await prisma.user.count({
        where: { role: 'ADMIN', NOT: { id } },
      });
      if (otherAdmins === 0) {
        const err = new Error('Cannot delete the last administrator');
        err.statusCode = 400;
        throw err;
      }
    }
    return prisma.user.delete({ where: { id }, select: SAFE_USER_SELECT });
  },
};
