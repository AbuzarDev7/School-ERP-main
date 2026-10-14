import { prisma } from "../../config/prisma.js";

export const productService = {
  create: (data) => {
    return prisma.product.create({
      data: { ...data }
    });
  },

  createBulk: async (productsData) => {
    return await prisma.product.createMany({
      data: productsData
    });
  },

  getAll: () => prisma.product.findMany({ orderBy: { createdAt: 'desc' } }),

  update: async (id, data) => {
  return await prisma.product.update({
    where: { id },
    data: { 
      ...data,
      updatedAt: new Date()
    },
  });
},

  delete: (id) => prisma.product.delete({ where: { id } }),
};