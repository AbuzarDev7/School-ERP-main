/*
  Warnings:

  - You are about to drop the column `parentName` on the `Student` table. All the data in the column will be lost.
  - Added the required column `class` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fatherName` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `section` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "parentName",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "admissionDate" TIMESTAMP(3),
ADD COLUMN     "class" TEXT NOT NULL,
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "fatherCnic" TEXT,
ADD COLUMN     "fatherName" TEXT NOT NULL,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "monthlyFee" DOUBLE PRECISION,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "section" TEXT NOT NULL;
