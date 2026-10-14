import {prisma} from '../../config/prisma.js';

export const cashbookService = {
  async createEntry(data) {
    return prisma.cashbook.create({ data });
  },

  async getAllEntries(filters = {}) {
    return prisma.cashbook.findMany({
      where: filters,
      orderBy: {
        date: 'desc',
      },
    });
  },

  async getEntryById(id) {
    return prisma.cashbook.findUnique({ where: { id } });
  },

  async updateEntry(id, data) {
    return prisma.cashbook.update({
      where: { id },
      data,
    });
  },

  async deleteEntry(id) {
    return prisma.cashbook.delete({ where: { id } });
  },
};