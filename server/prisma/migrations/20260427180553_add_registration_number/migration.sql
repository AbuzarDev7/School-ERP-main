/*
  Warnings:

  - You are about to drop the column `exam` on the `FeeStructure` table. All the data in the column will be lost.
  - You are about to drop the column `transport` on the `FeeStructure` table. All the data in the column will be lost.
  - You are about to drop the column `tuition` on the `FeeStructure` table. All the data in the column will be lost.
  - You are about to alter the column `sku` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `stockQuantity` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - The `rollNumber` column on the `Student` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[serialId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productNumber]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sku]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[regNumber]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[serialId]` on the table `Voucher` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Made the column `address` on table `Student` required. This step will fail if there are existing NULL values in that column.
  - Made the column `emergencyNumber` on table `Student` required. This step will fail if there are existing NULL values in that column.
  - Made the column `fathersCnic` on table `Student` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lastSession` on table `Student` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "FeeStructure" DROP COLUMN "exam",
DROP COLUMN "transport",
DROP COLUMN "tuition",
ALTER COLUMN "late" SET DEFAULT 100;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "serialId" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productNumber" SERIAL NOT NULL,
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "sku" DROP NOT NULL,
ALTER COLUMN "sku" DROP DEFAULT,
ALTER COLUMN "sku" SET DATA TYPE INTEGER,
ALTER COLUMN "unitPrice" DROP DEFAULT,
ALTER COLUMN "stockQuantity" SET DEFAULT 0,
ALTER COLUMN "stockQuantity" SET DATA TYPE INTEGER,
ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "regNumber" SERIAL NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL,
DROP COLUMN "rollNumber",
ADD COLUMN     "rollNumber" SERIAL NOT NULL,
ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "emergencyNumber" SET NOT NULL,
ALTER COLUMN "fathersCnic" SET NOT NULL,
ALTER COLUMN "lastSession" SET NOT NULL;

-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "serialId" SERIAL NOT NULL;

-- CreateTable
CREATE TABLE "FeeStructureItem" (
    "id" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "feeHeadId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "FeeStructureItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StudentDiscounts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StudentDiscounts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeStructureItem_feeStructureId_feeHeadId_key" ON "FeeStructureItem"("feeStructureId", "feeHeadId");

-- CreateIndex
CREATE INDEX "_StudentDiscounts_B_index" ON "_StudentDiscounts"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_serialId_key" ON "Invoice"("serialId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_productNumber_key" ON "Product"("productNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Student_regNumber_key" ON "Student"("regNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_serialId_key" ON "Voucher"("serialId");

-- AddForeignKey
ALTER TABLE "FeeStructureItem" ADD CONSTRAINT "FeeStructureItem_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructureItem" ADD CONSTRAINT "FeeStructureItem_feeHeadId_fkey" FOREIGN KEY ("feeHeadId") REFERENCES "FeeHead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentDiscounts" ADD CONSTRAINT "_StudentDiscounts_A_fkey" FOREIGN KEY ("A") REFERENCES "Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentDiscounts" ADD CONSTRAINT "_StudentDiscounts_B_fkey" FOREIGN KEY ("B") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
