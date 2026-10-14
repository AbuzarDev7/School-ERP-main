import { prisma } from "../../../config/prisma.js";

export const feeStructureService = {
  create: async (data) => {
    const { name, className, late, tuition, exam, transport, schoolFee, admissionFee, annualFund, courseFee, fees } = data;
    return prisma.feeStructure.create({
      data: {
        name: name || null,
        className,
        late,
        tuition,
        exam,
        transport,
        schoolFee: schoolFee || 0,
        admissionFee: admissionFee || 0,
        annualFund: annualFund || 0,
        courseFee: courseFee || 0,
        fees: {
          create: Object.entries(fees).map(([feeHeadId, amount]) => ({
            feeHeadId,
            amount,
          })),
        },
      },
      include: { fees: { include: { feeHead: true } } },
    });
  },

  getAll: () =>
    prisma.feeStructure.findMany({
      include: { fees: { include: { feeHead: true } } }, // Ensure feeHead is included
      orderBy: { className: "asc" },
    }),

  getById: (id) =>
    prisma.feeStructure.findUnique({
      where: { id },
      include: { fees: { include: { feeHead: true } } },
    }),

  update: async (id, data) => {
    const { name, className, late, tuition, exam, transport, schoolFee, admissionFee, annualFund, courseFee, fees } = data;

    // Verify the structure exists first to avoid generic Prisma errors
    const existing = await prisma.feeStructure.findUnique({ where: { id } });
    if (!existing) throw new Error("Fee structure not found");

    return prisma.$transaction(async (tx) => {
      // 1. Delete existing fee items associated with this structure
      await tx.feeStructureItem.deleteMany({
        where: { feeStructureId: id },
      });

      // 2. Update the main record and recreate the items
      return tx.feeStructure.update({
        where: { id },
        data: {
          name: name || null,
          className,
          late: Number(late),
          tuition: Number(tuition),
          exam: Number(exam),
          transport: Number(transport),
          schoolFee: Number(schoolFee || 0),
          admissionFee: Number(admissionFee || 0),
          annualFund: Number(annualFund || 0),
          courseFee: Number(courseFee || 0),
          fees: {
            create: Object.entries(fees || {}).map(([feeHeadId, amount]) => ({
              feeHeadId,
              amount: Number(amount),
            })),
          },
        },
        include: { fees: { include: { feeHead: true } } },
      });
    }, { timeout: 10000 }); // Increased timeout for heavy transactions
  },

  delete: (id) =>
    prisma.feeStructure.delete({
      where: { id },
    }),
};