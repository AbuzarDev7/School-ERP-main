-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransfer" (
    "id" TEXT NOT NULL,
    "fromMethodId" TEXT NOT NULL,
    "toMethodId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_name_key" ON "PaymentMethod"("name");

-- CreateIndex
CREATE INDEX "PaymentMethod_archived_idx" ON "PaymentMethod"("archived");

-- CreateIndex
CREATE INDEX "PaymentTransfer_date_idx" ON "PaymentTransfer"("date");

-- CreateIndex
CREATE INDEX "PaymentTransfer_fromMethodId_idx" ON "PaymentTransfer"("fromMethodId");

-- CreateIndex
CREATE INDEX "PaymentTransfer_toMethodId_idx" ON "PaymentTransfer"("toMethodId");

-- CreateIndex
CREATE INDEX "Cashbook_method_idx" ON "Cashbook"("method");

-- AddForeignKey
ALTER TABLE "PaymentTransfer" ADD CONSTRAINT "PaymentTransfer_fromMethodId_fkey" FOREIGN KEY ("fromMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransfer" ADD CONSTRAINT "PaymentTransfer_toMethodId_fkey" FOREIGN KEY ("toMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
