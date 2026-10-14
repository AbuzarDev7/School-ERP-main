import { prisma } from "../../config/prisma.js";

async function assertActiveMethod(tx, methodName) {
  const pm = await tx.paymentMethod.findUnique({ where: { name: methodName } });
  if (!pm) {
    const err = new Error(`Payment method "${methodName}" not found. Configure it in Payment Methods first.`);
    err.statusCode = 400;
    throw err;
  }
  if (pm.archived) {
    const err = new Error(`Payment method "${methodName}" is archived. Pick an active method.`);
    err.statusCode = 400;
    throw err;
  }
  return pm;
}

export const invoiceService = {
  create: async (data) => {
    const { items, paymentMethod, ...invoiceData } = data;

    return await prisma.$transaction(async (tx) => {
      // Generate Sequential Invoice Number
      const lastInvoice = await tx.invoice.findFirst({
        orderBy: { serialId: 'desc' }
      });
      const nextSerial = (lastInvoice?.serialId || 0) + 1;
      const invNum = `INV-${nextSerial.toString().padStart(4, '0')}`;

      // 1. Check and Update Stock
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product?.productName || item.productId}`);
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } }
        });
      }

      // 2. Validate the chosen method, then create the cashbook deposit (if grandTotal > 0)
      let cashbookEntryId = null;
      if (Number(invoiceData.grandTotal) > 0) {
        await assertActiveMethod(tx, paymentMethod);
        const cb = await tx.cashbook.create({
          data: {
            type: "in",
            description: `Sale — ${invNum}`,
            amount: Number(invoiceData.grandTotal),
            date: invoiceData.invoiceDate || new Date(),
            method: paymentMethod,
          }
        });
        cashbookEntryId = cb.id;
      }

      // 3. Create Invoice
      return await tx.invoice.create({
        data: {
          ...invoiceData,
          invoiceNumber: invNum,
          paymentMethod,
          cashbookEntryId,
          items: {
            create: items,
          },
        },
        include: { items: true },
      });
    });
  },

  getAll: () =>
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),

  getById: (id) =>
    prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    }),

  update: async (id, data) => {
    const { items, paymentMethod, ...invoiceData } = data;
    return await prisma.$transaction(async (tx) => {
      const oldInvoice = await tx.invoice.findUnique({
        where: { id },
        include: { items: true }
      });
      if (!oldInvoice) throw new Error("Invoice not found");

      // 1. Restore stock from old items
      for (const item of oldInvoice.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } }
        });
      }

      // 2. Remove old items
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

      // 3. Check and Deduct stock for new items
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } }
        });
      }

      // 4. Sync the cashbook deposit: drop the old, create a fresh one matching the new totals/method
      if (oldInvoice.cashbookEntryId) {
        await tx.cashbook.deleteMany({ where: { id: oldInvoice.cashbookEntryId } });
      }
      let cashbookEntryId = null;
      if (Number(invoiceData.grandTotal) > 0) {
        await assertActiveMethod(tx, paymentMethod);
        const cb = await tx.cashbook.create({
          data: {
            type: "in",
            description: `Sale — ${oldInvoice.invoiceNumber}`,
            amount: Number(invoiceData.grandTotal),
            date: invoiceData.invoiceDate || new Date(),
            method: paymentMethod,
          }
        });
        cashbookEntryId = cb.id;
      }

      return await tx.invoice.update({
        where: { id },
        data: {
          ...invoiceData,
          paymentMethod,
          cashbookEntryId,
          items: {
            create: items,
          },
        },
        include: { items: true },
      });
    });
  },

  delete: async (id) => {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { items: true }
      });
      if (!invoice) throw new Error("Invoice not found");

      for (const item of invoice.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } }
        });
      }

      if (invoice.cashbookEntryId) {
        await tx.cashbook.deleteMany({ where: { id: invoice.cashbookEntryId } });
      }

      return await tx.invoice.delete({ where: { id } });
    });
  }
};