// Centralized date formatter that respects the admin's choice in Settings.
// Pass a Date|string|number and the dateFormat string from AppSettings.
//
// Supported formats:
//   "DD/MM/YYYY"     → 09/05/2026
//   "MM/DD/YYYY"     → 05/09/2026
//   "YYYY-MM-DD"     → 2026-05-09 (ISO-friendly, sortable)
//   "DD MMM YYYY"    → 09 May 2026

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n) => String(n).padStart(2, "0");

export function formatDate(input, fmt = "DD/MM/YYYY") {
  if (input == null || input === "") return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";

  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const mmm = MONTHS_SHORT[d.getMonth()];

  switch (fmt) {
    case "MM/DD/YYYY":
      return `${mm}/${dd}/${yyyy}`;
    case "YYYY-MM-DD":
      return `${yyyy}-${mm}-${dd}`;
    case "DD MMM YYYY":
      return `${dd} ${mmm} ${yyyy}`;
    case "DD/MM/YYYY":
    default:
      return `${dd}/${mm}/${yyyy}`;
  }
}
