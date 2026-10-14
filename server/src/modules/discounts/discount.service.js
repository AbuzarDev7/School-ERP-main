import { prisma } from "../../config/prisma.js";

export const discountService = {
  create: (data) => 
    prisma.discount.create({ data }),

  getAll: () =>
    prisma.discount.findMany({
      orderBy: { name: "asc" },
    }),

  getById: (id) =>
    prisma.discount.findUnique({
      where: { id },
    }),

  update: (id, data) =>
    prisma.discount.update({
      where: { id },
      data,
    }),

  delete: (id) =>
    prisma.discount.delete({
      where: { id },
    }),
};