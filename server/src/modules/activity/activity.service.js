import { prisma } from '../../config/prisma.js';

const ALLOWED_ACTIONS = new Set([
  'LOGIN', 'LOGOUT',
  'STUDENT_CREATED', 'STUDENT_UPDATED', 'STUDENT_DELETED',
  'VOUCHER_CREATED', 'VOUCHER_UPDATED', 'VOUCHER_DELETED', 'PAYMENT_COLLECTED',
  'SETTINGS_UPDATED',
  'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
  'ROLE_CREATED', 'ROLE_UPDATED', 'ROLE_DELETED',
]);

export const activityService = {
  // Fire-and-forget logger — never throws to caller. Callers pass actor
  // context plucked off `req` plus action + (optional) entity info. We
  // snapshot the actor's name/email so the entry stays meaningful even if
  // the user is later deleted.
  log: ({
    actorId,
    actorName,
    actorEmail,
    action,
    entityType,
    entityId,
    entityLabel,
    details,
    ipAddress,
  }) => {
    if (!action || !ALLOWED_ACTIONS.has(action)) return;
    prisma.activityLog
      .create({
        data: {
          actorId: actorId || null,
          actorName: actorName || 'System',
          actorEmail: actorEmail || null,
          action,
          entityType: entityType || null,
          entityId: entityId || null,
          entityLabel: entityLabel || null,
          details: details ?? null,
          ipAddress: ipAddress || null,
        },
      })
      .catch((e) => console.error('[activity.log] insert failed:', e?.message));
  },

  list: async ({ limit = 100, action, actorId, entityType, entityId } = {}) => {
    const take = Math.min(500, Math.max(1, Number(limit) || 100));
    const where = {};
    if (action && ALLOWED_ACTIONS.has(action)) where.action = action;
    if (actorId) where.actorId = actorId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    return prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });
  },
};
