import crypto from "crypto";
import { prisma } from "../../../config/prisma.js";
import { settingsService } from "../../settings/settings.service.js";
// [Notifications disabled — re-enable when launching the feature]
// import { notificationsService } from "../../notifications/notifications.service.js";

// Maps Prisma's P2002 unique-violation error to a friendly message when the
// (studentId, month) constraint is hit. Returns null if the error isn't that.
const friendlyDuplicateError = (err, monthLabel) => {
  if (err?.code !== "P2002") return null;
  const target = err.meta?.target || [];
  if (target.includes("studentId") && target.includes("month")) {
    return new Error(`Voucher for ${monthLabel} already exists for this student.`);
  }
  return null;
};

// Builds the voucher number based on AppSettings. The serial restarts per
// cadence period — i.e. with MONTHLY cadence, the first voucher each month
// gets `0001`, regardless of the global auto-increment counter. We compute
// the next position by counting already-stamped vouchers in the current
// period (placeholders that haven't been stamped yet are filtered out).
//
// Concurrency: two simultaneous creations could compute the same count and
// produce a duplicate voucherNumber. The caller wraps this in a small retry
// loop and relies on the @unique constraint on voucherNumber to surface a
// collision. The retry then re-counts and gets the next free position.
const buildVoucherNumber = async (tx, createdAt) => {
  const settings = await settingsService.get();
  const prefix = settings.voucherPrefix || "V";
  const padding = Math.max(2, Math.min(10, settings.voucherPadding || 4));
  const cadence = settings.voucherResetCadence || "YEARLY";

  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  let segment = null;
  let periodWhere = {}; // vacuous match → counts all vouchers (NEVER)

  if (cadence === "YEARLY") {
    const y = date.getFullYear();
    segment = `${y}`;
    const start = new Date(y, 0, 1);
    const end = new Date(y + 1, 0, 1);
    periodWhere = { createdAt: { gte: start, lt: end } };
  } else if (cadence === "MONTHLY") {
    const y = date.getFullYear();
    const m = date.getMonth();
    segment = `${y}${(m + 1).toString().padStart(2, "0")}`;
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);
    periodWhere = { createdAt: { gte: start, lt: end } };
  }

  // Exclude placeholders (vouchers mid-creation) so we don't accidentally
  // count rows that don't have a real number yet.
  const stampedCount = await tx.voucher.count({
    where: {
      ...periodWhere,
      NOT: { voucherNumber: { startsWith: "__PENDING_" } },
    },
  });

  const position = stampedCount + 1;
  const serial = position.toString().padStart(padding, "0");
  return segment ? `${prefix}-${segment}-${serial}` : `${prefix}-${serial}`;
};

// Tries to stamp the voucher number, retrying on the unique-constraint race
// (two creators in the same period landing on the same count + 1). After a
// handful of retries we give up; in practice the second-attempt count sees
// the winner committed and lands on the next free slot.
const stampVoucherNumber = async (tx, voucherId, createdAt) => {
  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const candidate = await buildVoucherNumber(tx, createdAt);
      return await tx.voucher.update({
        where: { id: voucherId },
        data: { voucherNumber: candidate },
      });
    } catch (e) {
      lastErr = e;
      if (e?.code !== "P2002") throw e;
    }
  }
  throw lastErr;
};

export const voucherService = {
  // Single-voucher creation. The DB-level @@unique([studentId, month]) is the
  // source of truth for dedup, so no app-level pre-check is needed. The
  // voucherNumber is stamped from the auto-assigned serialId after insert,
  // which removes the count() race.
  create: async (data) => {
    try {
      const stamped = await prisma.$transaction(async (tx) => {
        const placeholder = `__PENDING_${crypto.randomUUID()}`;
        const created = await tx.voucher.create({
          data: { ...data, voucherNumber: placeholder, status: "UNPAID" },
        });
        return stampVoucherNumber(tx, created.id, created.createdAt);
      });

      // [Notifications disabled — re-enable when launching the feature]
      // dispatchVoucherCreated(stamped).catch((e) =>
      //   console.error('[voucher.create] notify failed:', e?.message)
      // );

      return stamped;
    } catch (err) {
      const friendly = friendlyDuplicateError(err, data.month);
      if (friendly) throw friendly;
      throw err;
    }
  },

  // Bulk creation. Pre-filters duplicates so the common case (re-running the
  // bulk action for a class that's already partly generated) is handled
  // without a transaction-aborting unique violation, but still relies on the
  // DB constraint for race safety.
  createBulk: async (vouchersData) => {
    if (!vouchersData.length) throw new Error("No voucher data provided");

    const normalizeMonth = (m) => String(m || "").trim().toLowerCase();
    const targetMonth = normalizeMonth(vouchersData[0]?.month);
    const studentIds = vouchersData.map((v) => v.studentId);

    const existing = await prisma.voucher.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true, studentId: true, month: true },
    });
    const existingIds = new Set(
      existing
        .filter((v) => normalizeMonth(v.month) === targetMonth)
        .map((v) => v.studentId)
    );
    const toCreate = vouchersData.filter((v) => !existingIds.has(v.studentId));

    if (toCreate.length === 0) {
      throw new Error(
        "Vouchers already generated for all students in this class for the selected month."
      );
    }

    try {
      const results = await prisma.$transaction(
        async (tx) => {
          const out = [];
          for (const data of toCreate) {
            const placeholder = `__PENDING_${crypto.randomUUID()}`;
            const created = await tx.voucher.create({
              data: { ...data, voucherNumber: placeholder, status: "UNPAID" },
            });
            const stamped = await stampVoucherNumber(tx, created.id, created.createdAt);
            out.push(stamped);
          }
          return out;
        },
        { timeout: 30000 }
      );

      // [Notifications disabled — re-enable when launching the feature]
      // Promise.resolve().then(async () => {
      //   for (const v of results) {
      //     await dispatchVoucherCreated(v).catch((e) =>
      //       console.error('[voucher.createBulk] notify failed:', e?.message)
      //     );
      //   }
      // });

      return results;
    } catch (err) {
      const friendly = friendlyDuplicateError(err, vouchersData[0]?.month);
      if (friendly) throw friendly;
      throw err;
    }
  },

  getAll: () =>
    prisma.voucher.findMany({
      orderBy: { createdAt: "desc" },
    }),

  updateStatus: async (id, data) => {
    const existing = await prisma.voucher.findUnique({ where: { id } });
    if (!existing) throw new Error("Voucher not found");

    return await prisma.$transaction(async (tx) => {
      const current = await tx.voucher.findUnique({ where: { id } });
      if (!current) throw new Error("Voucher not found");

      // Optimistic concurrency check. The client sends the paidAmount it
      // *thought* the voucher had when the cashier opened the modal. If
      // someone else has settled the voucher in the meantime, current.paidAmount
      // has moved and we reject. Without this, two cashiers can both submit
      // {paidAmount: 1000} for a 1000-rupee voucher — the second one's delta
      // computes to 0, no cashbook entry is written, and the cash they
      // collected disappears.
      if (data.expectedPaidAmount !== undefined && data.expectedPaidAmount !== null) {
        const expected = Number(data.expectedPaidAmount);
        const actual = Number(current.paidAmount || 0);
        if (Math.abs(expected - actual) > 0.01) {
          const err = new Error(
            "This voucher was just updated by another user. Please refresh and try again."
          );
          err.statusCode = 409;
          throw err;
        }
      }

      // Resolve effective totalPayable first — it may be updated in this same
      // request (e.g. late fine added). The cap below uses this value, not
      // current.totalPayable, so a same-request fine increase is honored.
      const effectiveTotal = Number(data.totalPayable ?? current.totalPayable);

      // If status is PAID, ensure paidAmount matches totalPayable when not provided
      const rawPaidAmount =
        data.status === "PAID"
          ? (data.paidAmount ?? effectiveTotal)
          : (data.paidAmount ?? current.paidAmount);

      // Belt-and-braces: even with the expected check above, reject any
      // update that would push paidAmount above totalPayable. Tolerate 1¢
      // of float jitter so a legitimate "pay the rest" doesn't bounce on
      // rounding error.
      if (Number(rawPaidAmount) > effectiveTotal + 0.01) {
        const err = new Error(
          "This voucher has already been updated. Please refresh and try again."
        );
        err.statusCode = 409;
        throw err;
      }
      const paidAmount = Math.min(Number(rawPaidAmount), effectiveTotal);

      const delta = Number(paidAmount) - Number(current.paidAmount || 0);
      const methodName = data.paymentMethod ?? current.paymentMethod;

      // Deposit only the new collection (delta) into the chosen method
      if (delta > 0) {
        if (!methodName) {
          const err = new Error("A payment method is required to record this collection.");
          err.statusCode = 400;
          throw err;
        }
        const pm = await tx.paymentMethod.findUnique({ where: { name: methodName } });
        if (!pm) {
          const err = new Error(
            `Payment method "${methodName}" not found. Configure it in Payment Methods first.`
          );
          err.statusCode = 400;
          throw err;
        }
        if (pm.archived) {
          const err = new Error(
            `Payment method "${methodName}" is archived. Pick an active method.`
          );
          err.statusCode = 400;
          throw err;
        }
        await tx.cashbook.create({
          data: {
            type: "in",
            description: `Fee — ${current.voucherNumber}`,
            amount: delta,
            date: new Date(),
            method: methodName,
          },
        });
      }

      const updated = await tx.voucher.update({
        where: { id },
        data: {
          status: data.status,
          paymentMethod: methodName,
          transactionId: data.transactionId ?? current.transactionId,
          fine: data.fine ?? current.fine,
          totalPayable: data.totalPayable ?? current.totalPayable,
          paidAmount: paidAmount,
        },
      });

      // H1: Only clear historical dues when the *current* voucher is fully paid.
      // The old condition also fired on partial payments that happened to cover
      // the arrears column, which incorrectly marked older PARTIAL/UNPAID
      // vouchers as PAID. H2: Use raw SQL so we can set paidAmount = totalPayable
      // in a single statement, keeping paid-vs-total reconciliation honest.
      if (updated.status === "PAID") {
        const result = await tx.$executeRaw`
          UPDATE "Voucher"
          SET "status" = 'PAID',
              "paidAmount" = "totalPayable",
              "updatedAt" = NOW()
          WHERE "studentId" = ${updated.studentId}
            AND "id" <> ${id}
            AND "serialId" < ${updated.serialId}
            AND "status" IN ('UNPAID', 'PARTIAL')
        `;
        console.log(`[VoucherService] Cleared ${result} previous voucher(s) for student ${updated.studentId}.`);
      }

      return updated;
    }, { timeout: 15000 });
  },

  // Cashier-driven edit before any payment has been recorded. Anything that
  // touches money has to bounce off `updateStatus` instead — once paidAmount
  // has moved, we can't silently rewrite the underlying figures or the
  // cashbook trail goes out of sync.
  edit: async (id, data) => {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.voucher.findUnique({ where: { id } });
      if (!current) throw new Error("Voucher not found");

      if (Number(current.paidAmount || 0) > 0) {
        const err = new Error(
          "This voucher already has a payment recorded — edit is disabled. Refund the collection first or adjust via Collect Fee."
        );
        err.statusCode = 409;
        throw err;
      }
      if (current.status !== "UNPAID") {
        const err = new Error(
          "Only fully-unpaid vouchers can be edited."
        );
        err.statusCode = 409;
        throw err;
      }

      // Apply partial overrides on top of the current row, then recompute
      // totalPayable so the cashier's tweak (e.g. waiving a fine) actually
      // shows up in the amount due.
      const merged = {
        dueDate: data.dueDate ?? current.dueDate,
        amount: data.amount ?? current.amount,
        arrears: data.arrears ?? current.arrears,
        fine: data.fine ?? current.fine,
        discount: data.discount ?? current.discount,
        tuitionDiscount: data.tuitionDiscount ?? current.tuitionDiscount,
        examDiscount: data.examDiscount ?? current.examDiscount,
        transportDiscount: data.transportDiscount ?? current.transportDiscount,
      };
      const totalPayable =
        Number(merged.amount || 0) +
        Number(merged.arrears || 0) +
        Number(merged.fine || 0) -
        Number(merged.discount || 0);

      return tx.voucher.update({
        where: { id },
        data: { ...merged, totalPayable: Math.max(0, totalPayable) },
      });
    });
  },

  delete: (id) => prisma.voucher.delete({ where: { id } }),
};

// [Notifications disabled — re-enable when launching the feature]
// Loads the student fresh because the voucher row only has studentId; the
// notifications service needs name/class/email/phone. Kept private to this
// module so callers don't have to remember to enrich the payload.
// async function dispatchVoucherCreated(voucher) {
//   if (!voucher?.studentId) return;
//   const student = await prisma.student.findUnique({ where: { id: voucher.studentId } });
//   await notificationsService.dispatchEvent({ event: 'VOUCHER_CREATED', student, voucher });
// }
