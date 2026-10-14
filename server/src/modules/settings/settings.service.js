import { prisma } from '../../config/prisma.js';
import { supabaseService } from '../../config/supabase.service.js';

const SINGLETON_ID = 'default';

// Empty-string from the form should be stored as null so the optional fields
// stay clean — otherwise a "saved blank" round-trip would persist `""` and
// break header/footer rendering checks.
const nullifyBlanks = (data) => {
  const out = { ...data };
  for (const k of [
    'schoolPhone', 'schoolEmail', 'schoolAddress', 'voucherHeader', 'voucherFooter',
    'notificationsEmailFrom', 'notificationsSmsFrom', 'notificationsWhatsappFrom',
    'regNumberPrefix', 'rollNumberPrefix',
  ]) {
    if (out[k] === '') out[k] = null;
  }
  return out;
};

export const settingsService = {
  // Lazy-init the singleton on first read so a fresh deployment doesn't need
  // a separate seed step. The defaults from the schema win on first create.
  get: async () => {
    let row = await prisma.appSettings.findUnique({ where: { id: SINGLETON_ID } });
    if (!row) {
      row = await prisma.appSettings.create({ data: { id: SINGLETON_ID } });
    }
    return row;
  },

  update: async (data) => {
    await settingsService.get(); // ensure singleton exists
    return prisma.appSettings.update({
      where: { id: SINGLETON_ID },
      data: nullifyBlanks(data),
    });
  },

  uploadLogo: async (file) => {
    if (!file) {
      const err = new Error('No file uploaded');
      err.statusCode = 400;
      throw err;
    }

    const current = await settingsService.get();
    if (current.schoolLogoUrl) {
      // Best-effort cleanup — Supabase delete failures shouldn't block the
      // upload of the new logo.
      await supabaseService.deleteFile(current.schoolLogoUrl).catch(() => {});
    }

    const url = await supabaseService.uploadFile(file, 'school-assets', 'school');
    return prisma.appSettings.update({
      where: { id: SINGLETON_ID },
      data: { schoolLogoUrl: url },
    });
  },

  removeLogo: async () => {
    const current = await settingsService.get();
    if (current.schoolLogoUrl) {
      await supabaseService.deleteFile(current.schoolLogoUrl).catch(() => {});
    }
    return prisma.appSettings.update({
      where: { id: SINGLETON_ID },
      data: { schoolLogoUrl: null },
    });
  },

  // Returns the next value each sequence will hand out. We don't call
  // nextval() since that would actually consume a number — instead we read
  // the sequence state directly. `is_called=true` means last_value has been
  // used and next will be last_value+1; `is_called=false` means the next
  // value IS last_value.
  getStudentSequences: async () => {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        (SELECT last_value FROM "Student_regNumber_seq") AS "regLastValue",
        (SELECT is_called FROM "Student_regNumber_seq") AS "regIsCalled",
        (SELECT last_value FROM "Student_rollNumber_seq") AS "rollLastValue",
        (SELECT is_called FROM "Student_rollNumber_seq") AS "rollIsCalled"
    `);
    const r = rows[0] || {};
    // last_value comes back as a BigInt — coerce to Number so JSON serialization works.
    const nextOf = (last, called) => Number(last) + (called ? 1 : 0);
    return {
      regNumberNext: nextOf(r.regLastValue, r.regIsCalled),
      rollNumberNext: nextOf(r.rollLastValue, r.rollIsCalled),
    };
  },

  // ALTER SEQUENCE RESTART WITH N — next nextval() returns N. Reject restarts
  // that would collide with existing rows on the unique reg# column; roll# is
  // not unique so duplicates are technically allowed, but we still warn the
  // admin if they're rewinding behind existing data.
  restartRegNumberSequence: async (startFrom) => {
    const max = await prisma.student.aggregate({ _max: { regNumber: true } });
    const existingMax = max._max.regNumber || 0;
    if (startFrom <= existingMax) {
      const err = new Error(
        `Cannot restart at ${startFrom}. Existing registration numbers go up to ${existingMax} — pick a value greater than ${existingMax}.`
      );
      err.statusCode = 400;
      throw err;
    }
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Student_regNumber_seq" RESTART WITH ${startFrom}`);
    return { regNumberNext: startFrom };
  },

  restartRollNumberSequence: async (startFrom) => {
    // Roll number is non-unique, but we still surface a warning when the
    // restart lands behind existing data so the admin can confirm.
    const max = await prisma.student.aggregate({ _max: { rollNumber: true } });
    const existingMax = max._max.rollNumber || 0;
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Student_rollNumber_seq" RESTART WITH ${startFrom}`);
    return {
      rollNumberNext: startFrom,
      warning: startFrom <= existingMax
        ? `Existing roll numbers reach ${existingMax}; values from ${startFrom} onwards will duplicate them.`
        : null,
    };
  },
};
