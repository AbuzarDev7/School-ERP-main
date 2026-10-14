-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "regNumberPadding" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "regNumberPrefix" TEXT,
ADD COLUMN     "rollNumberPadding" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rollNumberPrefix" TEXT;
