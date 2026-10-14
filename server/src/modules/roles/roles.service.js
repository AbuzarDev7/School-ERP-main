import { prisma } from '../../config/prisma.js';
import { PERMISSION_CATALOG, SYSTEM_ROLES } from './roles.defaults.js';

let didEnsureDefaults = false;

// Idempotently brings the DB in line with the static catalog. Called from
// listPermissions / listRoles before reading so a fresh deployment never
// shows an empty editor. Caches a flag in-process so we don't pay for
// the existence check on every request.
const ensureDefaults = async () => {
  if (didEnsureDefaults) return;

  const existingPerms = await prisma.permission.findMany({ select: { key: true } });
  const existingKeys = new Set(existingPerms.map((p) => p.key));
  const missingPerms = PERMISSION_CATALOG.filter((p) => !existingKeys.has(p.key));
  if (missingPerms.length > 0) {
    await prisma.permission.createMany({ data: missingPerms });
  }

  for (const def of SYSTEM_ROLES) {
    const existing = await prisma.role.findUnique({
      where: { name: def.name },
      include: { permissions: true },
    });
    const allKeys = PERMISSION_CATALOG.map((p) => p.key);
    const targetKeys = def.permissions === '*' ? allKeys : def.permissions;
    const targetPerms = await prisma.permission.findMany({
      where: { key: { in: targetKeys } },
    });

    if (!existing) {
      await prisma.role.create({
        data: {
          name: def.name,
          description: def.description,
          isSystem: true,
          permissions: { connect: targetPerms.map((p) => ({ id: p.id })) },
        },
      });
    } else if (existing.isSystem && existing.name === 'Admin') {
      // Keep Admin's permission set in lockstep with the catalog so newly
      // added permissions don't silently leave Admin without access.
      const have = new Set(existing.permissions.map((p) => p.id));
      const missing = targetPerms.filter((p) => !have.has(p.id));
      if (missing.length > 0) {
        await prisma.role.update({
          where: { id: existing.id },
          data: { permissions: { connect: missing.map((p) => ({ id: p.id })) } },
        });
      }
    }
  }

  didEnsureDefaults = true;
};

export const rolesService = {
  listPermissions: async () => {
    await ensureDefaults();
    return prisma.permission.findMany({ orderBy: [{ category: 'asc' }, { key: 'asc' }] });
  },

  list: async () => {
    await ensureDefaults();
    return prisma.role.findMany({
      include: {
        permissions: { select: { id: true, key: true, label: true, category: true } },
        _count: { select: { users: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  },

  create: async ({ name, description, permissionIds = [] }) => {
    if (!name?.trim()) {
      const err = new Error('Role name is required');
      err.statusCode = 400;
      throw err;
    }
    return prisma.role.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        permissions: { connect: permissionIds.map((id) => ({ id })) },
      },
      include: {
        permissions: { select: { id: true, key: true, label: true, category: true } },
        _count: { select: { users: true } },
      },
    });
  },

  update: async (id, { name, description, permissionIds }) => {
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      const err = new Error('Role not found');
      err.statusCode = 404;
      throw err;
    }
    // System roles keep their name — renaming would invalidate the seeder's
    // upsert key. Permissions are still editable so admins can tweak the
    // baseline scope.
    const data = {};
    if (!existing.isSystem && name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (Array.isArray(permissionIds)) {
      data.permissions = { set: permissionIds.map((pid) => ({ id: pid })) };
    }

    return prisma.role.update({
      where: { id },
      data,
      include: {
        permissions: { select: { id: true, key: true, label: true, category: true } },
        _count: { select: { users: true } },
      },
    });
  },

  remove: async (id) => {
    const existing = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) {
      const err = new Error('Role not found');
      err.statusCode = 404;
      throw err;
    }
    if (existing.isSystem) {
      const err = new Error('System roles cannot be deleted');
      err.statusCode = 400;
      throw err;
    }
    if (existing._count.users > 0) {
      const err = new Error(`Cannot delete role — ${existing._count.users} user(s) still assigned`);
      err.statusCode = 400;
      throw err;
    }
    return prisma.role.delete({ where: { id } });
  },
};
