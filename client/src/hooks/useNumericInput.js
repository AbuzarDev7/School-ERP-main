import { useCallback } from "react";

export const useNumericInput = () => {
  // Sanitize a free-form input value into a clamped non-negative number.
  //
  // Signature kept backwards compatible: existing callers `sanitize(value, max, min)`
  // continue to work and stay integer-only by default. To accept fractional
  // input (e.g., per-hour rates like 150.50), pass `{ allowDecimals: true }`
  // as the fourth argument. Returns `null` on bound violation so the caller
  // can ignore the update.
  const sanitize = useCallback((value, max = Infinity, min = 0, opts = {}) => {
    const { allowDecimals = false } = opts;
    const raw = value.toString();

    let cleaned;
    if (allowDecimals) {
      // Strip everything that isn't a digit or a dot; collapse multiple dots
      // (rare but possible from paste) by keeping only the first.
      const stripped = raw.replace(/[^\d.]/g, "");
      const dotIdx = stripped.indexOf(".");
      cleaned = dotIdx === -1
        ? stripped
        : stripped.slice(0, dotIdx + 1) + stripped.slice(dotIdx + 1).replace(/\./g, "");
    } else {
      cleaned = raw.replace(/\D/g, "");
    }

    // Trim leading zeros on the integer part (but keep "0" and "0.5")
    const intMatch = cleaned.match(/^0+(\d)/);
    if (intMatch) cleaned = cleaned.replace(/^0+(?=\d)/, "");

    if (cleaned === "" || cleaned === ".") return 0;

    const numValue = Number(cleaned);
    if (!Number.isFinite(numValue)) return null;
    if (numValue < min || numValue > max) return null;

    // For decimal mode, preserve the trailing-dot string ("12.") and
    // partial-decimal ("12.3") states so the user can keep typing. We do
    // that by returning the number; the caller renders it via a controlled
    // input that displays the user's typed string, not Number(...) round-trip.
    return numValue;
  }, []);

  return { sanitize };
};