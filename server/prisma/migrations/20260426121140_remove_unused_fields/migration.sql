/*
  Warnings:

  - You are about to drop the column `admissionDate` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `dob` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `fatherCnic` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `fatherName` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyFee` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `section` on the `Student` table. All the data in the column will be lost.
  - Added the required column `fathersName` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "admissionDate",
DROP COLUMN "dob",
DROP COLUMN "fatherCnic",
DROP COLUMN "fatherName",
DROP COLUMN "gender",
DROP COLUMN "monthlyFee",
DROP COLUMN "section",
ADD COLUMN     "emergencyNumber" TEXT,
ADD COLUMN     "fathersCnic" TEXT,
ADD COLUMN     "fathersName" TEXT NOT NULL,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "guardianOccupation" TEXT,
ADD COLUMN     "lastSession" TEXT,
ADD COLUMN     "previousSchool" TEXT;
