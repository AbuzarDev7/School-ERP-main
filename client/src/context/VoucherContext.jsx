import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { voucherClient } from "@/services/voucherService";
import { useStudents } from "@/context/StudentContext";
import { useFeeStructures } from "@/context/FeeStructureContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "sonner";

const VoucherContext = createContext();

// Pakistani Rupees don't circulate in fractional denominations, so a balance
// under one full rupee is treated as fully paid. The 0.5 cutoff splits ties
// the same way Math.round does — anything that rounds to zero is dropped.
// Without this, residual paise (e.g. 0.3 from prior partial payments)
// would leak into the arrears column as a stale "outstanding".
const ARREARS_ROUNDING_THRESHOLD = 0.5;

// ✅ helpers (centralized)
const normalize = (val) => String(val).trim().toLowerCase();
const isUnpaid = (status) =>
  String(status || '').trim().toUpperCase() !== "PAID";

export function VoucherProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { students } = useStudents();
  const { structures } = useFeeStructures();
  const { settings } = useSettings();

  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ---------------- FETCH ----------------
  const fetchVouchers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await voucherClient.getAll();
      setVouchers(data || []);
    } catch (e) {
      console.error(e);
      setError("Failed to load vouchers. Please check your connection.");
      toast.error("Connection Error: Unable to reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------- CRUD ----------------
  const addVoucher = useCallback(async (data) => {
    const res = await voucherClient.create(data);
    setVouchers((prev) => [res, ...prev]);
    return res;
  }, []);

  const updateVoucher = useCallback(async (id, data) => {
    // Optimistic local update; server is authoritative on the re-fetch below.
    setVouchers((prev) => prev.map((v) => (v.id === id ? { ...v, ...data } : v)));
    await voucherClient.updateStatus(id, data);
    // Re-fetch to sync side-effects (historical dues clearing, paidAmount alignment)
    await fetchVouchers();
  }, [fetchVouchers]);

  const deleteVoucher = useCallback(async (id) => {
    try {
      await voucherClient.delete(id);
      setVouchers((prev) => prev.filter((v) => v.id !== id));
      toast.success("Voucher deleted successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete voucher");
    }
  }, []);

  // Cashier-side edit of an unpaid voucher (dueDate / amount / fine / discount).
  // Server rejects with 409 if the voucher already has any payment recorded,
  // so we don't gate that here — callers surface the toast.
  const editVoucher = useCallback(async (id, data) => {
    const updated = await voucherClient.edit(id, data);
    setVouchers((prev) => prev.map((v) => (v.id === id ? { ...v, ...updated } : v)));
    return updated;
  }, []);

  const addBulk = useCallback(async (dataList) => {
    setLoading(true);
    try {
      let res;
      if (typeof voucherClient.createBulk === "function") {
        res = await voucherClient.createBulk(dataList);
      } else {
        res = await Promise.all(dataList.map((item) => voucherClient.create(item)));
      }
      setVouchers((prev) => [...res, ...prev]);
      return res;
    } catch (e) {
      console.error("Bulk voucher creation failed:", e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------- OPTIMIZED LOOKUPS ----------------
  const studentMap = useMemo(() => {
    const map = new Map();
    students.forEach((s) => map.set(normalize(s.id), s));
    return map;
  }, [students]);

  const structureMap = useMemo(() => {
    const map = new Map();
    structures.forEach((s) => map.set(s.className, s));
    return map;
  }, [structures]);

  const vouchersByStudent = useMemo(() => {
    const map = new Map();
    vouchers.forEach((v) => {
      const sId = normalize(v.studentId);
      if (!map.has(sId)) map.set(sId, []);
      map.get(sId).push(v);
    });
    return map;
  }, [vouchers]);

  // ---------------- LATE FINE ----------------
  // Per-class FeeStructure.late wins when set (>0). Otherwise fall back to
  // the global default in AppSettings. Grace days from settings push out the
  // first chargeable day — useful when admins want a "no fine for the first
  // 5 days past due" policy without editing every fee structure row.
  const getLateDetails = useCallback(
    (dueDate, studentId) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);

      const diffTime = today - due;
      const rawDaysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

      const grace = Math.max(0, Number(settings?.graceDays || 0));
      const lateDays = Math.max(0, rawDaysLate - grace);

      const student = studentMap.get(normalize(studentId));
      const structure = student ? structureMap.get(student.class) : null;

      const classFine = Number(structure?.late || 0);
      const fallbackFine = Number(settings?.defaultLateFinePerDay || 0);
      const finePerDay = classFine > 0 ? classFine : fallbackFine;

      return { lateDays, lateFine: lateDays * finePerDay };
    },
    [studentMap, structureMap, settings?.graceDays, settings?.defaultLateFinePerDay]
  );

  // ---------------- ✅ FIXED ARREARS ----------------
  const calculateArrears = useCallback(
    (studentId) => {
      const studentVouchers = vouchersByStudent.get(normalize(studentId)) || [];
      if (!studentVouchers.length) return 0;

      // latest first (already sorted by server desc)
      const latest = studentVouchers[0];
      const balance = (Number(latest.totalPayable) || 0) - (Number(latest.paidAmount) || 0);

      return balance > ARREARS_ROUNDING_THRESHOLD ? Math.round(balance) : 0;
    },
    [vouchersByStudent]
  );

  const getUnpaidMonthsCount = useCallback((studentId) => {
    const studentVouchers = vouchersByStudent.get(normalize(studentId)) || [];
    return studentVouchers.filter(v => isUnpaid(v.status)).length;
  }, [vouchersByStudent]);

  // ---------------- PENDING LIST ----------------
  const pendingDuesList = useMemo(() => {
    return students
      .map((student) => ({
        ...student,
        balance: calculateArrears(student.id),
      }))
      .filter((s) => s.balance > 0);
  }, [students, calculateArrears]);

  const totalOutstanding = useMemo(
    () =>
      pendingDuesList.reduce((acc, s) => acc + s.balance, 0),
    [pendingDuesList]
  );

  // Preview-only number — server stamps the real one based on AppSettings
  // after insert. Mirror the server's per-period counting so the preview is
  // accurate: count vouchers already created in the current cadence period
  // and add 1.
  const nextVoucherNumber = useMemo(() => {
    const prefix = settings?.voucherPrefix || "V";
    const padding = Math.max(2, Math.min(10, Number(settings?.voucherPadding || 4)));
    const cadence = settings?.voucherResetCadence || "YEARLY";
    const now = new Date();

    let segment = null;
    let inPeriod;
    if (cadence === "YEARLY") {
      segment = `${now.getFullYear()}`;
      const y = now.getFullYear();
      inPeriod = vouchers.filter((v) => v.createdAt && new Date(v.createdAt).getFullYear() === y).length;
    } else if (cadence === "MONTHLY") {
      segment = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}`;
      const y = now.getFullYear();
      const m = now.getMonth();
      inPeriod = vouchers.filter((v) => {
        if (!v.createdAt) return false;
        const d = new Date(v.createdAt);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length;
    } else {
      // NEVER — continuous count over all vouchers
      inPeriod = vouchers.length;
    }

    const serial = (inPeriod + 1).toString().padStart(padding, "0");
    return segment ? `${prefix}-${segment}-${serial}` : `${prefix}-${serial}`;
  }, [vouchers, settings?.voucherPrefix, settings?.voucherPadding, settings?.voucherResetCadence]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchVouchers();
  }, [isAuthenticated, fetchVouchers]);

  return (
    <VoucherContext.Provider
      value={{
        vouchers,
        setVouchers,
        loading,
        error,
        refreshVouchers: fetchVouchers,
        addVoucher,
        updateVoucher,
        editVoucher,
        deleteVoucher,
        addBulk,
        calculateArrears,
        getLateDetails,
        pendingDuesList,
        getUnpaidMonthsCount,
        totalOutstanding,
        nextVoucherNumber,
      }}
    >
      {children}
    </VoucherContext.Provider>
  );
}

export const useVouchers = () => {
  const context = useContext(VoucherContext);
  if (!context) {
    throw new Error(
      "useVouchers must be used within a VoucherProvider"
    );
  }
  return context;
};