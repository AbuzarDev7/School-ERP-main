-- Convert Cashbook.type from text to a constrained enum, and add an index
-- supporting the per-method per-time-window balance aggregation used by
-- paymentMethod.service.js::computeBalances. Existing rows already use
-- "in"/"out" exclusively (verified across all writers), so the cast is safe.

CREATE TYPE "CashbookEntryType" AS ENUM ('in', 'out');

ALTER TABLE "Cashbook"
  ALTER COLUMN "type" TYPE "CashbookEntryType"
  USING "type"::"CashbookEntryType";

CREATE INDEX "Cashbook_method_createdAt_idx" ON "Cashbook"("method", "createdAt");
