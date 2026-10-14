import { prisma } from '../../config/prisma.js';
import { settingsService } from '../settings/settings.service.js';

// CSV-safe escape: doubles internal quotes and wraps any value containing
// quote/comma/newline in quotes. Anything else passes through raw so the
// output stays readable when opened in Excel or a plain editor.
const csvEscape = (val) => {
  if (val == null) return '';
  const s = String(val);
  if (/["\n,]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const toCSV = (rows, columns) => {
  const head = columns.map((c) => csvEscape(c.label)).join(',');
  const body = rows
    .map((r) => columns.map((c) => csvEscape(c.get ? c.get(r) : r[c.key])).join(','))
    .join('\n');
  // BOM so Excel renders UTF-8 (Urdu names, etc.) correctly without nudging.
  return `﻿${head}\n${body}`;
};

const fmtDate = (d) => (d ? new Date(d).toISOString() : '');

const STUDENT_COLUMNS = [
  { key: 'regNumber', label: 'Reg #' },
  { key: 'rollNumber', label: 'Roll #' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'class', label: 'Class' },
  { key: 'status', label: 'Status' },
  { key: 'fathersName', label: "Father's Name" },
  { key: 'fathersCnic', label: "Father's CNIC" },
  { key: 'guardianName', label: 'Guardian' },
  { key: 'phone', label: 'Phone' },
  { key: 'emergencyNumber', label: 'Emergency Phone' },
  { key: 'address', label: 'Address' },
  { key: 'lastSession', label: 'Last Session' },
  { label: 'Admission Date', get: (r) => fmtDate(r.admissionDate) },
  { label: 'DOB', get: (r) => fmtDate(r.dob) },
  { key: 'tuitionDiscount', label: 'Tuition Discount' },
  { key: 'examDiscount', label: 'Exam Discount' },
  { key: 'transportDiscount', label: 'Transport Discount' },
  { label: 'Created At', get: (r) => fmtDate(r.createdAt) },
];

const VOUCHER_COLUMNS = [
  { key: 'voucherNumber', label: 'Voucher #' },
  { key: 'month', label: 'Month' },
  { label: 'Student', get: (r) => `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.trim() },
  { label: 'Reg #', get: (r) => r.student?.regNumber ?? '' },
  { label: 'Class', get: (r) => r.student?.class ?? '' },
  { label: 'Due Date', get: (r) => fmtDate(r.dueDate) },
  { key: 'amount', label: 'Amount' },
  { key: 'arrears', label: 'Arrears' },
  { key: 'fine', label: 'Fine' },
  { key: 'discount', label: 'Discount' },
  { key: 'totalPayable', label: 'Total Payable' },
  { key: 'paidAmount', label: 'Paid Amount' },
  { key: 'status', label: 'Status' },
  { key: 'paymentMethod', label: 'Payment Method' },
  { key: 'transactionId', label: 'Transaction Id' },
  { label: 'Created At', get: (r) => fmtDate(r.createdAt) },
  { label: 'Updated At', get: (r) => fmtDate(r.updatedAt) },
];

const CASHBOOK_COLUMNS = [
  { label: 'Date', get: (r) => fmtDate(r.date) },
  { key: 'type', label: 'Type' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount' },
  { key: 'method', label: 'Payment Method' },
  { label: 'Recorded At', get: (r) => fmtDate(r.createdAt) },
];

export const dataService = {
  // Returns a `{ filename, contentType, body }` triple ready for the
  // controller to stream back. Format defaults to JSON if unrecognized so
  // an external tool that mistypes ?format=excel still gets a usable file.
  exportData: async ({ type, format }) => {
    const isCSV = String(format).toLowerCase() === 'csv';
    let rows;
    let columns;
    let baseName;

    if (type === 'students') {
      rows = await prisma.student.findMany({ orderBy: { regNumber: 'asc' } });
      columns = STUDENT_COLUMNS;
      baseName = 'students';
    } else if (type === 'vouchers') {
      rows = await prisma.voucher.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          student: {
            select: { firstName: true, lastName: true, regNumber: true, class: true },
          },
        },
      });
      columns = VOUCHER_COLUMNS;
      baseName = 'vouchers';
    } else if (type === 'payments') {
      rows = await prisma.cashbook.findMany({ orderBy: { date: 'desc' } });
      columns = CASHBOOK_COLUMNS;
      baseName = 'payments';
    } else {
      const err = new Error(`Unsupported export type: ${type}`);
      err.statusCode = 400;
      throw err;
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `${baseName}-${stamp}.${isCSV ? 'csv' : 'json'}`;

    if (isCSV) {
      return {
        filename,
        contentType: 'text/csv; charset=utf-8',
        body: toCSV(rows, columns),
      };
    }
    return {
      filename,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(rows, null, 2),
    };
  },

  // Resets the current academic year by deleting every voucher and
  // restarting the auto-increment sequence. The Cashbook is intentionally
  // left intact — that's your historical money trail and shouldn't move
  // when the billing layer rolls over.
  resetAcademicYear: async (confirmation) => {
    const settings = await settingsService.get();
    if (!confirmation || confirmation.trim() !== settings.schoolName) {
      const err = new Error('Confirmation text does not match school name');
      err.statusCode = 400;
      throw err;
    }

    return prisma.$transaction(async (tx) => {
      const { count } = await tx.voucher.deleteMany({});
      // Postgres uses `<Table>_<col>_seq` for serial columns; restart so
      // next year's vouchers start fresh at 1.
      await tx.$executeRawUnsafe(`ALTER SEQUENCE "Voucher_serialId_seq" RESTART WITH 1`);
      return { vouchersDeleted: count };
    });
  },

  // ---------- IMPORT ----------
  //
  // Merge-on-conflict: rows whose unique-key collides with the existing DB
  // are silently skipped (with a reason returned to the caller). The intent
  // is "restore from a previous JSON export after a wipe", but it's also
  // safe to re-run partial imports — duplicate-protected by the schema's
  // own constraints rather than by counting on a clean target table.
  //
  // Each importer:
  //   1. Coerces date-string fields back to Date objects so Prisma's typed
  //      input is happy. ISO strings would also work but a real Date is
  //      faster and avoids a subtle TZ pitfall on partial inputs.
  //   2. Pre-fetches existing unique keys in ONE round-trip and filters the
  //      input array client-side. Cheaper than catching per-row P2002s.
  //   3. Inserts the survivors inside a transaction. createMany() is plenty
  //      fast for school-scale (a few thousand rows) and gives us atomic
  //      rollback if any unexpected error pops up.
  //   4. Bumps the relevant Postgres sequence past the max imported value
  //      so the next app-driven insert doesn't collide with a restored id.

  importStudents: async (rows) => {
    if (!Array.isArray(rows)) {
      const err = new Error('Expected an array of student rows');
      err.statusCode = 400;
      throw err;
    }

    const existing = await prisma.student.findMany({ select: { id: true, regNumber: true } });
    const existingIds = new Set(existing.map((s) => s.id));
    const existingReg = new Set(existing.map((s) => Number(s.regNumber)));

    const toInsert = [];
    const skipped = [];
    const errors = [];

    rows.forEach((row, index) => {
      if (!row || typeof row !== 'object') {
        return errors.push({ index, reason: 'Row is not an object' });
      }
      const required = ['id', 'firstName', 'class', 'lastSession', 'fathersName', 'phone', 'emergencyNumber', 'address', 'fathersCnic'];
      const missing = required.filter((k) => row[k] === undefined || row[k] === null || row[k] === '');
      if (missing.length > 0) {
        return errors.push({ index, reason: `Missing required fields: ${missing.join(', ')}` });
      }
      if (existingIds.has(row.id)) {
        return skipped.push({ index, id: row.id, reason: 'Same id already exists' });
      }
      if (row.regNumber != null && existingReg.has(Number(row.regNumber))) {
        return skipped.push({ index, regNumber: row.regNumber, reason: 'Reg# already in use' });
      }

      // Whitelist scalar columns — relations like `discounts` aren't part of
      // the export, but if a future export adds them we don't want Prisma
      // throwing on an unknown field.
      const {
        id, regNumber, rollNumber, firstName, lastName,
        dob, admissionDate, status, class: cls, lastSession,
        fathersName, fathersCnic, guardianName, guardianOccupation,
        phone, emergencyNumber, email, address, previousSchool,
        photo, birthCertificate, fatherCnicFile, leavingCertificate,
        tuitionDiscount, examDiscount, transportDiscount,
        createdAt, updatedAt,
      } = row;

      toInsert.push({
        id,
        regNumber: regNumber != null ? Number(regNumber) : undefined,
        rollNumber: rollNumber != null ? Number(rollNumber) : undefined,
        firstName,
        lastName: lastName ?? null,
        dob: dob ? new Date(dob) : null,
        admissionDate: admissionDate ? new Date(admissionDate) : null,
        status: status || 'ACTIVE',
        class: cls,
        lastSession,
        fathersName,
        fathersCnic,
        guardianName: guardianName ?? null,
        guardianOccupation: guardianOccupation ?? null,
        phone,
        emergencyNumber,
        email: email ?? null,
        address,
        previousSchool: previousSchool ?? null,
        photo: photo ?? null,
        birthCertificate: birthCertificate ?? null,
        fatherCnicFile: fatherCnicFile ?? null,
        leavingCertificate: leavingCertificate ?? null,
        tuitionDiscount: Number(tuitionDiscount || 0),
        examDiscount: Number(examDiscount || 0),
        transportDiscount: Number(transportDiscount || 0),
        createdAt: createdAt ? new Date(createdAt) : undefined,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
      });

      // Track within-batch dupes too so a malformed file with repeated ids
      // doesn't slip past the pre-check.
      existingIds.add(id);
      if (regNumber != null) existingReg.add(Number(regNumber));
    });

    let inserted = 0;
    if (toInsert.length > 0) {
      await prisma.$transaction(async (tx) => {
        const res = await tx.student.createMany({ data: toInsert });
        inserted = res.count;
        await tx.$executeRawUnsafe(
          `SELECT setval('"Student_regNumber_seq"', GREATEST(COALESCE((SELECT MAX("regNumber") FROM "Student"), 0), 1), true)`
        );
        await tx.$executeRawUnsafe(
          `SELECT setval('"Student_rollNumber_seq"', GREATEST(COALESCE((SELECT MAX("rollNumber") FROM "Student"), 0), 1), true)`
        );
      }, { timeout: 60000 });
    }

    return { total: rows.length, inserted, skipped, errors };
  },

  importVouchers: async (rows) => {
    if (!Array.isArray(rows)) {
      const err = new Error('Expected an array of voucher rows');
      err.statusCode = 400;
      throw err;
    }

    const [existingVouchers, allStudents] = await Promise.all([
      prisma.voucher.findMany({
        select: { id: true, voucherNumber: true, serialId: true, studentId: true, month: true },
      }),
      prisma.student.findMany({ select: { id: true } }),
    ]);
    const existingIds = new Set(existingVouchers.map((v) => v.id));
    const existingNumbers = new Set(existingVouchers.map((v) => v.voucherNumber));
    const existingSerials = new Set(existingVouchers.map((v) => v.serialId));
    const existingStudentMonth = new Set(existingVouchers.map((v) => `${v.studentId}::${String(v.month || '').toLowerCase()}`));
    const studentIds = new Set(allStudents.map((s) => s.id));

    const toInsert = [];
    const skipped = [];
    const errors = [];

    rows.forEach((row, index) => {
      if (!row || typeof row !== 'object') {
        return errors.push({ index, reason: 'Row is not an object' });
      }
      const required = ['id', 'voucherNumber', 'studentId', 'month', 'dueDate', 'amount', 'totalPayable'];
      const missing = required.filter((k) => row[k] === undefined || row[k] === null || row[k] === '');
      if (missing.length > 0) {
        return errors.push({ index, reason: `Missing required fields: ${missing.join(', ')}` });
      }
      if (!studentIds.has(row.studentId)) {
        return skipped.push({ index, voucherNumber: row.voucherNumber, reason: 'Referenced student not found — import students first' });
      }
      if (existingIds.has(row.id)) {
        return skipped.push({ index, id: row.id, reason: 'Same id already exists' });
      }
      if (existingNumbers.has(row.voucherNumber)) {
        return skipped.push({ index, voucherNumber: row.voucherNumber, reason: 'Voucher number already in use' });
      }
      if (row.serialId != null && existingSerials.has(Number(row.serialId))) {
        return skipped.push({ index, serialId: row.serialId, reason: 'Serial id already in use' });
      }
      const key = `${row.studentId}::${String(row.month || '').toLowerCase()}`;
      if (existingStudentMonth.has(key)) {
        return skipped.push({ index, voucherNumber: row.voucherNumber, reason: 'Student already has a voucher for this month' });
      }

      const {
        id, serialId, voucherNumber, studentId, month, dueDate,
        amount, arrears, fine, discount,
        tuitionDiscount, examDiscount, transportDiscount,
        totalPayable, paidAmount, status, paymentMethod, transactionId,
        createdAt, updatedAt,
      } = row;

      toInsert.push({
        id,
        serialId: serialId != null ? Number(serialId) : undefined,
        voucherNumber,
        studentId,
        month,
        dueDate: new Date(dueDate),
        amount: Number(amount),
        arrears: Number(arrears || 0),
        fine: Number(fine || 0),
        discount: Number(discount || 0),
        tuitionDiscount: Number(tuitionDiscount || 0),
        examDiscount: Number(examDiscount || 0),
        transportDiscount: Number(transportDiscount || 0),
        totalPayable: Number(totalPayable),
        paidAmount: Number(paidAmount || 0),
        status: status || 'UNPAID',
        paymentMethod: paymentMethod ?? null,
        transactionId: transactionId ?? null,
        createdAt: createdAt ? new Date(createdAt) : undefined,
        updatedAt: updatedAt ? new Date(updatedAt) : undefined,
      });

      existingIds.add(id);
      existingNumbers.add(voucherNumber);
      if (serialId != null) existingSerials.add(Number(serialId));
      existingStudentMonth.add(key);
    });

    let inserted = 0;
    if (toInsert.length > 0) {
      await prisma.$transaction(async (tx) => {
        const res = await tx.voucher.createMany({ data: toInsert });
        inserted = res.count;
        await tx.$executeRawUnsafe(
          `SELECT setval('"Voucher_serialId_seq"', GREATEST(COALESCE((SELECT MAX("serialId") FROM "Voucher"), 0), 1), true)`
        );
      }, { timeout: 60000 });
    }

    return { total: rows.length, inserted, skipped, errors };
  },

  importPayments: async (rows) => {
    if (!Array.isArray(rows)) {
      const err = new Error('Expected an array of payment rows');
      err.statusCode = 400;
      throw err;
    }

    const existing = await prisma.cashbook.findMany({ select: { id: true } });
    const existingIds = new Set(existing.map((c) => c.id));

    const toInsert = [];
    const skipped = [];
    const errors = [];

    rows.forEach((row, index) => {
      if (!row || typeof row !== 'object') {
        return errors.push({ index, reason: 'Row is not an object' });
      }
      const required = ['id', 'type', 'description', 'amount', 'method', 'date'];
      const missing = required.filter((k) => row[k] === undefined || row[k] === null || row[k] === '');
      if (missing.length > 0) {
        return errors.push({ index, reason: `Missing required fields: ${missing.join(', ')}` });
      }
      if (existingIds.has(row.id)) {
        return skipped.push({ index, id: row.id, reason: 'Same id already exists' });
      }
      // Cashbook.type is an enum: 'in' | 'out'. Anything else would crash
      // Prisma's enum check — surface it as a row-level error.
      if (row.type !== 'in' && row.type !== 'out') {
        return errors.push({ index, reason: `Unknown type "${row.type}" (expected "in" or "out")` });
      }

      const { id, type, description, amount, method, date, createdAt } = row;
      toInsert.push({
        id,
        type,
        description,
        amount: Number(amount),
        method,
        date: new Date(date),
        createdAt: createdAt ? new Date(createdAt) : undefined,
      });
      existingIds.add(id);
    });

    let inserted = 0;
    if (toInsert.length > 0) {
      await prisma.$transaction(async (tx) => {
        const res = await tx.cashbook.createMany({ data: toInsert });
        inserted = res.count;
      }, { timeout: 60000 });
    }

    return { total: rows.length, inserted, skipped, errors };
  },

  // Nuclear option — clears every operational table so the school can be
  // re-onboarded from scratch. User accounts + AppSettings are deliberately
  // preserved so the admin doesn't lock themselves out.
  wipeAllData: async (confirmation) => {
    const settings = await settingsService.get();
    if (!confirmation || confirmation.trim() !== settings.schoolName) {
      const err = new Error('Confirmation text does not match school name');
      err.statusCode = 400;
      throw err;
    }

    return prisma.$transaction(
      async (tx) => {
        // Order matters where FKs would otherwise block deletes. Children
        // before parents.
        await tx.invoiceItem.deleteMany({});
        await tx.invoice.deleteMany({});
        await tx.workerExtraHours.deleteMany({});
        await tx.workerAdvance.deleteMany({});
        await tx.workerPayment.deleteMany({});
        await tx.worker.deleteMany({});
        await tx.expense.deleteMany({});
        await tx.expenseHead.deleteMany({});
        await tx.cashbook.deleteMany({});
        await tx.paymentTransfer.deleteMany({});
        await tx.paymentMethod.deleteMany({});
        await tx.voucher.deleteMany({});
        await tx.feeStructureItem.deleteMany({});
        await tx.feeStructure.deleteMany({});
        await tx.feeHead.deleteMany({});
        await tx.discount.deleteMany({});
        await tx.product.deleteMany({});
        await tx.student.deleteMany({});

        // Reset sequences so a freshly seeded school starts at 1.
        for (const seq of [
          'Student_regNumber_seq',
          'Student_rollNumber_seq',
          'Voucher_serialId_seq',
          'Invoice_serialId_seq',
          'Product_productNumber_seq',
        ]) {
          await tx.$executeRawUnsafe(`ALTER SEQUENCE "${seq}" RESTART WITH 1`).catch(() => {});
        }

        return { success: true };
      },
      { timeout: 60000 }
    );
  },
};
