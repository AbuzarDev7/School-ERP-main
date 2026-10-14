-- Enforce one voucher per student per month at the database level.
-- This closes the TOCTOU race where two concurrent requests could both
-- pass the application-level findFirst check before either had written.
--
-- If this migration fails with a unique-constraint violation, existing
-- duplicates must be reconciled first. To find them:
--   SELECT "studentId", "month", COUNT(*)
--   FROM "Voucher"
--   GROUP BY "studentId", "month"
--   HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX "Voucher_studentId_month_key" ON "Voucher"("studentId", "month");
