import { prisma } from '../../config/prisma.js';

async function computeMethodBalance(tx, methodName) {
  const method = await tx.paymentMethod.findUnique({ where: { name: methodName } });
  if (!method) return { method: null, balance: 0 };
  if (method.archived) return { method, balance: 0, archived: true };

  const cashbookRows = await tx.cashbook.findMany({
    where: { method: methodName, createdAt: { gte: method.createdAt } },
    select: { type: true, amount: true },
  });
  let balance = Number(method.openingBalance) || 0;
  for (const row of cashbookRows) {
    balance += row.type === 'in' ? Number(row.amount) : -Number(row.amount);
  }

  const [out, inn] = await Promise.all([
    tx.paymentTransfer.aggregate({
      _sum: { amount: true },
      where: { fromMethodId: method.id },
    }),
    tx.paymentTransfer.aggregate({
      _sum: { amount: true },
      where: { toMethodId: method.id },
    }),
  ]);
  balance -= Number(out._sum.amount || 0);
  balance += Number(inn._sum.amount || 0);
  return { method, balance: Math.round(balance * 100) / 100 };
}

export const workerService = {
  async getAllWorkers(month = null) {
    const query = {
      where: {}, // Add global filters here if needed (e.g. status: "Active")
    };

    if (month) {
      query.include = {
        advances: { where: { month } },
        extraHours: { where: { month } },
        payments: { where: { month } },
      };
    }

    return prisma.worker.findMany(query);
  },

  async getWorkerById(id) {
    return prisma.worker.findUnique({
      where: { id },
      include: {
        advances: true,
        extraHours: true,
        payments: true,
      },
    });
  },

  async getPayrollContext(workerId, month) {
    const [worker, advances, payments, pendingExtraHours] = await Promise.all([
      prisma.worker.findUnique({ where: { id: workerId } }),
      prisma.workerAdvance.findMany({
        where: { workerId, month },
        orderBy: { date: "asc" },
      }),
      prisma.workerPayment.findMany({
        where: { workerId, month },
        take: 1,
      }),
      prisma.workerExtraHours.findMany({
        where: { workerId, month, paymentId: null },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!worker) return null;

    return {
      worker,
      advances,
      payment: payments[0] || null,
      pendingExtraHours,
    };
  },

  async createWorker(data) {
    return prisma.worker.create({ data });
  },

  async updateWorker(id, data) {
    return prisma.worker.update({
      where: { id },
      data,
    });
  },

  async deleteWorker(id) {
    return prisma.worker.update({
      where: { id },
      data: { status: "Inactive" }
    });
  },

  async reactivateWorker(id) {
    return prisma.worker.update({
      where: { id },
      data: { status: "Active" }
    });
  },

  async createAdvance(data) {
    return prisma.$transaction(async (tx) => {
      const worker = await tx.worker.findUnique({ where: { id: data.workerId } });
      if (!worker) throw new Error("Worker not found");

      // Enforce advance cap: amount + existing advances for the month <= monthlySalary
      const existing = await tx.workerAdvance.findMany({
        where: { workerId: data.workerId, month: data.month },
        select: { amount: true },
      });
      const existingTotal = existing.reduce((s, a) => s + Number(a.amount), 0);
      const remaining = Number(worker.monthlySalary) - existingTotal;
      if (Number(data.amount) > remaining) {
        const err = new Error(
          remaining <= 0
            ? `${worker.name} has already taken their full salary as advance`
            : `Advance exceeds limit. Max allowed: ${remaining}`
        );
        err.statusCode = 400;
        throw err;
      }

      const { method = "Cash", ...advanceData } = data;

      // 1. Create Cashbook entry
      const cashbook = await tx.cashbook.create({
        data: {
          type: "out",
          description: `Advance — ${worker.name} (${data.month})`,
          amount: data.amount,
          date: data.date || new Date(),
          method,
        }
      });

      // 2. Create the advance record
      return tx.workerAdvance.create({
        data: {
          ...advanceData,
          cashbookEntryId: cashbook.id,
        }
      });
    });
  },

  async updateAdvance(id, data) {
    return prisma.$transaction(async (tx) => {
      const advance = await tx.workerAdvance.findUnique({ where: { id } });
      if (!advance) throw new Error("Advance not found");

      const worker = await tx.worker.findUnique({ where: { id: advance.workerId } });
      if (!worker) throw new Error("Worker not found");

      const targetMonth = data.month || advance.month;
      const newAmount = data.amount !== undefined ? Number(data.amount) : Number(advance.amount);

      // Enforce advance cap excluding the current advance's old amount
      const existing = await tx.workerAdvance.findMany({
        where: { workerId: advance.workerId, month: targetMonth, NOT: { id } },
        select: { amount: true },
      });
      const existingTotal = existing.reduce((s, a) => s + Number(a.amount), 0);
      const remaining = Number(worker.monthlySalary) - existingTotal;
      if (newAmount > remaining) {
        const err = new Error(`Advance exceeds limit. Max allowed: ${remaining}`);
        err.statusCode = 400;
        throw err;
      }

      const { method, ...advanceData } = data;

      // Sync cashbook entry: amount, date, description (if month changed), method
      if (advance.cashbookEntryId) {
        const cashbookUpdate = {};
        if (data.amount !== undefined) cashbookUpdate.amount = data.amount;
        if (data.date !== undefined) cashbookUpdate.date = data.date;
        if (method !== undefined) cashbookUpdate.method = method;
        if (data.month && data.month !== advance.month) {
          cashbookUpdate.description = `Advance — ${worker.name} (${data.month})`;
        }
        if (Object.keys(cashbookUpdate).length > 0) {
          await tx.cashbook.update({
            where: { id: advance.cashbookEntryId },
            data: cashbookUpdate,
          });
        }
      }

      return tx.workerAdvance.update({
        where: { id },
        data: advanceData,
      });
    });
  },

  async deleteAdvance(id) {
    return prisma.$transaction(async (tx) => {
      const advance = await tx.workerAdvance.findUnique({ where: { id } });
      if (!advance) return;

      if (advance.cashbookEntryId) {
        await tx.cashbook.deleteMany({ where: { id: advance.cashbookEntryId } });
      }

      return tx.workerAdvance.delete({ where: { id } });
    });
  },

  async createExtraHours(data) {
    return prisma.workerExtraHours.create({ data });
  },

  async updateExtraHours(id, data) {
    return prisma.workerExtraHours.update({ where: { id }, data });
  },

  async deleteExtraHours(id) {
    return prisma.workerExtraHours.delete({ where: { id } });
  },

  async createPayment(data) {
    const { workerId, month, netPaid, paidDate, notes, method = "Cash", ...paymentFields } = data;

    return prisma.$transaction(async (tx) => {
      // Block double-payment for the same worker/month
      const existing = await tx.workerPayment.findFirst({
        where: { workerId, month },
        select: { id: true },
      });
      if (existing) {
        const err = new Error(`Salaries already paid for ${month}`);
        err.statusCode = 400;
        throw err;
      }

      // 1. Create Cashbook entry if netPaid > 0 — only if the chosen method has enough balance
      let cashbookEntryId = null;
      if (netPaid > 0) {
        const { method: pm, balance, archived } = await computeMethodBalance(tx, method);
        if (!pm) {
          throw Object.assign(new Error(`Payment method "${method}" not found. Configure it in Payment Methods first.`), { statusCode: 400 });
        }
        if (archived) {
          throw Object.assign(new Error(`Payment method "${method}" is archived. Pick an active method.`), { statusCode: 400 });
        }
        if (netPaid > balance) {
          throw Object.assign(
            new Error(`Insufficient balance in "${method}". Available: ${balance}, required: ${netPaid}.`),
            { statusCode: 400 }
          );
        }

        const worker = await tx.worker.findUnique({ where: { id: workerId } });
        const cashbook = await tx.cashbook.create({
          data: {
            type: "out",
            description: `Salaries — ${worker.name} (${month})`,
            amount: netPaid,
            date: paidDate || new Date(),
            method,
          }
        });
        cashbookEntryId = cashbook.id;
      }

      // 2. Create the payment record
      const payment = await tx.workerPayment.create({
        data: {
          workerId,
          month,
          ...paymentFields,
          netPaid,
          paidDate: paidDate || new Date(),
          notes,
          cashbookEntryId,
        }
      });

      // 3. Link pending extra hours for this worker/month to this payment
      await tx.workerExtraHours.updateMany({
        where: {
          workerId,
          month,
          paymentId: null
        },
        data: {
          paymentId: payment.id
        }
      });

      return payment;
    }, {
      maxWait: 5000, // Time to wait for a connection from the pool (default 2s)
      timeout: 15000 // Total time allowed for the transaction to complete (default 5s)
    });
  },

  async undoPayment(paymentId) {
    return prisma.$transaction(async (tx) => {
      console.log(`Attempting to undo payment with ID: ${paymentId}`);
      const payment = await tx.workerPayment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new Error(`Payment record not found for ID: ${paymentId}`);

      // 1. Delete associated Cashbook entry
      if (payment.cashbookEntryId) {
        await tx.cashbook.deleteMany({ where: { id: payment.cashbookEntryId } });
      }

      // 2. Unlink overtime records
      await tx.workerExtraHours.updateMany({
        where: { paymentId },
        data: { paymentId: null }
      });

      // 3. Delete the payment
      return tx.workerPayment.delete({ where: { id: paymentId } });
    });
  }
};