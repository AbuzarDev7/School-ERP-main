import { prisma } from "../../config/prisma.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Optionally accepts a transaction client so callers can compute balances
// inside a $transaction and have their reads serialized with their writes.
// Without this, a concurrent transfer could drain the source between the
// balance check and the transfer insert.
//
// Performance: previously loaded the full Cashbook table into memory and
// looped per method. Replaced with parallel per-method aggregates (server-
// side SUM grouped by type), so cost scales with method count rather than
// cashbook row count.
async function computeBalances(methods, client = prisma) {
  if (methods.length === 0) return [];

  const [cashbookSums, transferOut, transferIn] = await Promise.all([
    Promise.all(
      methods.map((m) =>
        client.cashbook.groupBy({
          by: ["type"],
          where: { method: m.name, createdAt: { gte: m.createdAt } },
          _sum: { amount: true },
        })
      )
    ),
    client.paymentTransfer.groupBy({
      by: ["fromMethodId"],
      _sum: { amount: true },
    }),
    client.paymentTransfer.groupBy({
      by: ["toMethodId"],
      _sum: { amount: true },
    }),
  ]);

  return methods.map((m, i) => {
    let balance = Number(m.openingBalance) || 0;
    for (const row of cashbookSums[i]) {
      const sum = Number(row._sum.amount || 0);
      balance += row.type === "in" ? sum : -sum;
    }
    const out = transferOut.find((t) => t.fromMethodId === m.id);
    const inn = transferIn.find((t) => t.toMethodId === m.id);
    if (out?._sum?.amount) balance -= Number(out._sum.amount);
    if (inn?._sum?.amount) balance += Number(inn._sum.amount);
    return { ...m, currentBalance: Math.round(balance * 100) / 100 };
  });
}

export const paymentMethodService = {
  async getAll({ includeArchived = false } = {}) {
    const methods = await prisma.paymentMethod.findMany({
      where: includeArchived ? {} : { archived: false },
      orderBy: { createdAt: "asc" },
    });
    return computeBalances(methods);
  },

  async getById(id) {
    const method = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!method) return null;
    const [withBalance] = await computeBalances([method]);
    return withBalance;
  },

  async create(data) {
    const existing = await prisma.paymentMethod.findUnique({ where: { name: data.name } });
    if (existing) throw httpError(`A payment method named "${data.name}" already exists`);
    return prisma.paymentMethod.create({ data });
  },

  async update(id, data) {
    const method = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!method) throw httpError("Payment method not found", 404);

    return prisma.$transaction(async (tx) => {
      // If renaming, rename matching cashbook rows so they continue to attribute to this method
      if (data.name && data.name !== method.name) {
        const conflict = await tx.paymentMethod.findUnique({ where: { name: data.name } });
        if (conflict) throw httpError(`A payment method named "${data.name}" already exists`);
        await tx.cashbook.updateMany({
          where: { method: method.name },
          data: { method: data.name },
        });
      }
      return tx.paymentMethod.update({ where: { id }, data });
    });
  },

  async setArchived(id, archived) {
    const method = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!method) throw httpError("Payment method not found", 404);
    return prisma.paymentMethod.update({ where: { id }, data: { archived } });
  },

  async listTransfers({ from, to } = {}) {
    const where = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    return prisma.paymentTransfer.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        fromMethod: { select: { id: true, name: true } },
        toMethod: { select: { id: true, name: true } },
      },
    });
  },

  async createTransfer(data) {
    // Serializable isolation prevents two concurrent transfers from both
    // observing a sufficient balance and then both committing — Postgres
    // will fail the second one with a serialization error, which Prisma
    // surfaces as P2034. We bubble that up as a friendly retry message.
    try {
      return await prisma.$transaction(
        async (tx) => {
          const [from, to] = await Promise.all([
            tx.paymentMethod.findUnique({ where: { id: data.fromMethodId } }),
            tx.paymentMethod.findUnique({ where: { id: data.toMethodId } }),
          ]);
          if (!from) throw httpError("Source payment method not found", 404);
          if (!to) throw httpError("Destination payment method not found", 404);
          if (from.archived || to.archived) throw httpError("Archived methods cannot transfer");
          if (from.id === to.id) throw httpError("Source and destination must differ");
          if (Number(data.amount) <= 0) throw httpError("Transfer amount must be greater than zero");

          // Read the balance through the same tx so it sees a consistent
          // snapshot with the upcoming write.
          const [withBalance] = await computeBalances([from], tx);
          const fromBalance = withBalance.currentBalance;
          if (Number(data.amount) > fromBalance) {
            throw httpError(
              `Insufficient balance in ${from.name}. Available: ${fromBalance}`
            );
          }

          return tx.paymentTransfer.create({
            data: {
              fromMethodId: data.fromMethodId,
              toMethodId: data.toMethodId,
              amount: data.amount,
              date: data.date || new Date(),
              note: data.note || "",
            },
            include: {
              fromMethod: { select: { id: true, name: true } },
              toMethod: { select: { id: true, name: true } },
            },
          });
        },
        { isolationLevel: "Serializable" }
      );
    } catch (err) {
      if (err?.code === "P2034") {
        throw httpError("Another transfer just touched this account. Please retry.", 409);
      }
      throw err;
    }
  },

  async deleteTransfer(id) {
    const transfer = await prisma.paymentTransfer.findUnique({ where: { id } });
    if (!transfer) throw httpError("Transfer not found", 404);
    return prisma.paymentTransfer.delete({ where: { id } });
  },
};
