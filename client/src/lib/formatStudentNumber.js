// Display formatters for Student.regNumber and Student.rollNumber. The
// underlying column is an integer auto-increment (so unique constraints and
// sorting stay sane), but the admin can attach a prefix and/or zero-padding
// via Settings → Student Numbering. Callers receive the formatted string —
// raw integers should only appear in inputs and DB queries.

const formatNumber = (value, prefix, padding) => {
  if (value === null || value === undefined || value === "") return "—";
  const padded = String(value).padStart(Math.max(0, Math.min(10, Number(padding) || 0)), "0");
  const p = (typeof prefix === "string" ? prefix : "") || "";
  return p ? `${p}${padded}` : padded;
};

export function formatRegNumber(value, settings) {
  return formatNumber(value, settings?.regNumberPrefix, settings?.regNumberPadding);
}

export function formatRollNumber(value, settings) {
  return formatNumber(value, settings?.rollNumberPrefix, settings?.rollNumberPadding);
}
