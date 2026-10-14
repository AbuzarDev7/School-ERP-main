// Shared date-range filter for the Reports module.
//
// Compares a record's timestamp against a from/to YYYY-MM-DD pair using LOCAL
// year/month/day components on both sides. Avoids the timezone pitfall in
// `new Date("2026-05-08").toDateString()` which can roll a day backward for
// browsers west of UTC.
//
//   withinDateRange(record.createdAt, "2026-05-01", "2026-05-31") // bounded
//   withinDateRange(record.createdAt, "2026-05-01", "")           // open end
//   withinDateRange(record.createdAt, "", "2026-05-31")           // open start
//   withinDateRange(record.createdAt, "", "")                     // pass-through
//
// Both endpoints are inclusive. Bounds are compared as strings — YYYY-MM-DD
// sorts lexicographically the same as chronologically, so we don't need
// further parsing.
export const withinDateRange = (recordTs, fromYmd, toYmd) => {
  if (!fromYmd && !toYmd) return true;
  if (!recordTs) return false;
  const d = new Date(recordTs);
  const recYmd =
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, "0")}-` +
    `${String(d.getDate()).padStart(2, "0")}`;
  if (fromYmd && recYmd < fromYmd) return false;
  if (toYmd && recYmd > toYmd) return false;
  return true;
};
