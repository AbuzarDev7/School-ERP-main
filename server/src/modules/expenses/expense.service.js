import { prisma } from "../../config/prisma.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

async function assertActiveMethod(tx, methodName) {
  const pm = await tx.paymentMethod.findUnique({ where: { name: methodName } });
  if (!pm) throw httpError(`Payment method "${methodName}" not found. Configure it in Payment Methods first.`);
  if (pm.archived) throw httpError(`Payment method "${methodName}" is archived. Pick an active method.`);
  return pm;
}

async function computeMethodBalance(tx, methodName) {
  const method = await tx.paymentMethod.findUnique({ where: { name: methodName } });
  if (!method) return null;
  const cashbookRows = await tx.cashbook.findMany({
    where: { method: methodName, createdAt: { gte: method.createdAt } },
    select: { type: true, amount: true },
  });
  let balance = Number(method.openingBalance) || 0;
  for (const row of cashbookRows) {
    balance += row.type === "in" ? Number(row.amount) : -Number(row.amount);
  }
  const [out, inn] = await Promise.all([
    tx.paymentTransfer.aggregate({ _sum: { amount: true }, where: { fromMethodId: method.id } }),
    tx.paymentTransfer.aggregate({ _sum: { amount: true }, where: { toMethodId: method.id } }),
  ]);
  balance -= Number(out._sum.amount || 0);
  balance += Number(inn._sum.amount || 0);
  return Math.round(balance * 100) / 100;
}

export const expenseHeadService = {
  list: ({ includeArchived = false } = {}) =>
    prisma.expenseHead.findMany({
      where: includeArchived ? {} : { archived: false },
      orderBy: { name: "asc" },
    }),

  create: async (data) => {
    const existing = await prisma.expenseHead.findUnique({ where: { name: data.name } });
    if (existing) throw httpError(`An expense head named "${data.name}" already exists`);
    return prisma.expenseHead.create({ data });
  },

  update: async (id, data) => {
    const head = await prisma.expenseHead.findUnique({ where: { id } });
    if (!head) throw httpError("Expense head not found", 404);
    if (data.name && data.name !== head.name) {
      const conflict = await prisma.expenseHead.findUnique({ where: { name: data.name } });
      if (conflict) throw httpError(`An expense head named "${data.name}" already exists`);
    }
    return prisma.expenseHead.update({ where: { id }, data });
  },

  setArchived: async (id, archived) => {
    const head = await prisma.expenseHead.findUnique({ where: { id } });
    if (!head) throw httpError("Expense head not found", 404);
    return prisma.expenseHead.update({ where: { id }, data: { archived } });
  },

  remove: async (id) => {
    const head = await prisma.expenseHead.findUnique({ where: { id } });
    if (!head) throw httpError("Expense head not found", 404);
    const usage = await prisma.expense.count({ where: { headId: id } });
    if (usage > 0) {
      throw httpError(`This head has ${usage} expense(s) recorded. Archive it instead of deleting.`);
    }
    return prisma.expenseHead.delete({ where: { id } });
  },
};

export const expenseService = {
  list: ({ from, to, headId } = {}) => {
    const where = {};
    if (headId) where.headId = headId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    return prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      include: { head: { select: { id: true, name: true } } },
    });
  },

  create: async (data) => {
    return prisma.$transaction(async (tx) => {
      const head = await tx.expenseHead.findUnique({ where: { id: data.headId } });
      if (!head) throw httpError("Expense head not found", 404);
      if (head.archived) throw httpError(`Expense head "${head.name}" is archived`);

      const balance = await computeMethodBalance(tx, data.paymentMethod);
      if (balance === null) {
        throw httpError(`Payment method "${data.paymentMethod}" not found. Configure it in Payment Methods first.`);
      }
      await assertActiveMethod(tx, data.paymentMethod);
      if (Number(data.amount) > balance) {
        throw httpError(`Insufficient balance in "${data.paymentMethod}". Available: ${balance}, required: ${data.amount}.`);
      }

      const cashbook = await tx.cashbook.create({
        data: {
          type: "out",
          description: `Expense — ${head.name}${data.detail ? ` (${data.detail})` : ""}`,
          amount: Number(data.amount),
          date: data.date || new Date(),
          method: data.paymentMethod,
        },
      });

      return tx.expense.create({
        data: {
          headId: data.headId,
          date: data.date || new Date(),
          amount: Number(data.amount),
          detail: data.detail || "",
          paymentMethod: data.paymentMethod,
          cashbookEntryId: cashbook.id,
        },
        include: { head: { select: { id: true, name: true } } },
      });
    });
  },

  update: async (id, data) => {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findUnique({ where: { id } });
      if (!existing) throw httpError("Expense not found", 404);

      const head = await tx.expenseHead.findUnique({ where: { id: data.headId } });
      if (!head) throw httpError("Expense head not found", 404);
      if (head.archived) throw httpError(`Expense head "${head.name}" is archived`);

      // Validate balance assuming the previous cashbook row is reverted (we'll delete it below)
      const newBalance = await computeMethodBalance(tx, data.paymentMethod);
      if (newBalance === null) {
        throw httpError(`Payment method "${data.paymentMethod}" not found.`);
      }
      await assertActiveMethod(tx, data.paymentMethod);

      const sameMethod = data.paymentMethod === existing.paymentMethod;
      const offset = sameMethod ? Number(existing.amount) : 0;
      const projected = newBalance + offset;
      if (Number(data.amount) > projected) {
        throw httpError(`Insufficient balance in "${data.paymentMethod}". Available: ${projected}, required: ${data.amount}.`);
      }

      // Drop old cashbook row, create a fresh one
      if (existing.cashbookEntryId) {
        await tx.cashbook.deleteMany({ where: { id: existing.cashbookEntryId } });
      }
      const cashbook = await tx.cashbook.create({
        data: {
          type: "out",
          description: `Expense — ${head.name}${data.detail ? ` (${data.detail})` : ""}`,
          amount: Number(data.amount),
          date: data.date || existing.date,
          method: data.paymentMethod,
        },
      });

      return tx.expense.update({
        where: { id },
        data: {
          headId: data.headId,
          date: data.date || existing.date,
          amount: Number(data.amount),
          detail: data.detail || "",
          paymentMethod: data.paymentMethod,
          cashbookEntryId: cashbook.id,
        },
        include: { head: { select: { id: true, name: true } } },
      });
    });
  },

  remove: async (id) => {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findUnique({ where: { id } });
      if (!existing) throw httpError("Expense not found", 404);
      if (existing.cashbookEntryId) {
        await tx.cashbook.deleteMany({ where: { id: existing.cashbookEntryId } });
      }
      return tx.expense.delete({ where: { id } });
    });
  },
};
