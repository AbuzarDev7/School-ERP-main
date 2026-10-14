import { useCallback } from "react";

export const useNumericInput = () => {
  const sanitize = useCallback((value, max = Infinity, min = 0) => {
    // 1. Filter non-numeric characters (only allow digits)
    const digits = value.toString().replace(/\D/g, "");

    // 2. Remove leading zeros (e.g., "0123" -> "123"), but allow "0" to stay
    const sanitized = (digits.startsWith("0") && digits.length > 1)
      ? digits.replace(/^0+/, "")
      : digits;

    const numValue = sanitized === "" ? 0 : Number(sanitized);

    // 3. Bound checking: return null if invalid so component can ignore the update
    if (numValue < min || numValue > max) return null;

    return numValue;
  }, []);

  return { sanitize };
};