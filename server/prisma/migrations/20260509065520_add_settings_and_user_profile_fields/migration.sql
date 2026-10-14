-- CreateEnum
CREATE TYPE "VoucherResetCadence" AS ENUM ('YEARLY', 'MONTHLY', 'NEVER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "schoolName" TEXT NOT NULL DEFAULT 'My School',
    "schoolPhone" TEXT,
    "schoolEmail" TEXT,
    "schoolAddress" TEXT,
    "schoolLogoUrl" TEXT,
    "voucherHeader" TEXT,
    "voucherFooter" TEXT,
    "voucherPrefix" TEXT NOT NULL DEFAULT 'V',
    "voucherPadding" INTEGER NOT NULL DEFAULT 4,
    "voucherResetCadence" "VoucherResetCadence" NOT NULL DEFAULT 'YEARLY',
    "graceDays" INTEGER NOT NULL DEFAULT 0,
    "defaultLateFinePerDay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "absenceWorkingDaysDivisor" INTEGER NOT NULL DEFAULT 30,
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
