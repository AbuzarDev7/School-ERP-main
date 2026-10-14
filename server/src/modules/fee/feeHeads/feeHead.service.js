import { prisma } from "../../../config/prisma.js";

export const feeHeadService = {
  create: (data) => 
    prisma.feeHead.create({ data }),

  getAll: () =>
    prisma.feeHead.findMany({
      orderBy: { name: "asc" },
    }),

  getById: (id) =>
    prisma.feeHead.findUnique({
      where: { id },
    }),

  update: (id, data) =>
    prisma.feeHead.update({
      where: { id },
      data,
    }),

  delete: (id) =>
    prisma.feeHead.delete({
      where: { id },
    }),
};