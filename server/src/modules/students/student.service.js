// student.service.js
import { prisma } from "../../config/prisma.js"

export const studentService = {
  create: (data) => {
    const { discountIds, email, ...rest } = data;
    // Normalize "" → null so the unique-email constraint stays clean
    // and notifications.recipientFor() can short-circuit on null.
    const cleanedEmail = email && String(email).trim() !== '' ? email : null;
    rest.email = cleanedEmail;
    let parsedDiscountIds = [];
    if (discountIds) {
      try {
        parsedDiscountIds = typeof discountIds === 'string' ? JSON.parse(discountIds) : discountIds;
      } catch (e) {
        console.error("Error parsing discountIds in create:", e);
      }
    }

    if (!Array.isArray(parsedDiscountIds)) parsedDiscountIds = [];

    return prisma.student.create({
      data: {
        ...rest,
        discounts: parsedDiscountIds.length > 0 ? { connect: parsedDiscountIds.map(id => ({ id })) } : undefined
      },
      include: { discounts: true }
    });
  },

  getAll: () =>
    prisma.student.findMany({
      include: { discounts: true },
      orderBy: { createdAt: "desc" },
    }),

  getById: (id) =>
    prisma.student.findUnique({
      where: { id },
      include: { discounts: true },
    }),

  update: (id, data) => {
    const { discountIds, email, ...rest } = data;
    // Normalize "" → null so the unique-email constraint stays clean
    // and notifications.recipientFor() can short-circuit on null.
    const cleanedEmail = email && String(email).trim() !== '' ? email : null;
    rest.email = cleanedEmail;
    let parsedDiscountIds = [];
    if (discountIds) {
      try {
        parsedDiscountIds = typeof discountIds === 'string' ? JSON.parse(discountIds) : discountIds;
      } catch (e) {
        console.error("Error parsing discountIds in update:", e);
      }
    }

    if (!Array.isArray(parsedDiscountIds)) parsedDiscountIds = [];

    return prisma.student.update({
      where: { id },
      data: {
        ...rest,
        discounts: { set: parsedDiscountIds.map(id => ({ id })) }
      },
      include: { discounts: true }
    });
  },

  softDelete: (id, status) =>
    prisma.student.update({
      where: { id },
      data: { status },
    }),
}