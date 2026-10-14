import { useState, useMemo, useEffect } from "react"
import { Layers, Receipt, Check, Calendar, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import VoucherPrinter from "../VoucherPrinter"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStudents } from "@/context/StudentContext"
import { useFeeStructures } from "@/context/FeeStructureContext"
import { useVouchers } from "@/context/VoucherContext"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const getDefaultDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return date.toISOString().split("T")[0];
};

export default function GenerateBulkVoucherModal({ open, setOpen }) {
  const { students } = useStudents();
  const { structures } = useFeeStructures();
  const { addBulk, calculateArrears, getLateDetails } = useVouchers();
  const [loading, setLoading] = useState(false);
  const [generatedVouchers, setGeneratedVouchers] = useState([]);
  const [includeArrears, setIncludeArrears] = useState(true);

  const now = new Date();
  const [bulkClass, setBulkClass] = useState("");
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [bulkDueDate, setBulkDueDate] = useState(getDefaultDueDate());

  // Compose the voucher month string from the dual selectors so the rest of
  // the form (and the server payload) keep using the existing "May 2026" shape.
  const bulkMonth = `${MONTHS[filterMonth]} ${filterYear}`;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const startYear = 2026;
  const futureYearsLimit = 3;
  const years = useMemo(() => {
    const arr = [];
    for (let y = startYear; y <= currentYear + futureYearsLimit; y++) arr.push(y);
    return arr;
  }, [currentYear]);

  // Allowed billing months: the current calendar month and the immediately
  // preceding one. Computed explicitly so the year-rollover case (January,
  // where the previous month is December of the prior year) is handled
  // correctly instead of via month-index arithmetic that breaks at the
  // boundary (`i < 0 - 1` is never true, which used to enable every month).
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const isMonthAllowed = (year, month) =>
    (year === currentYear && month === currentMonth) ||
    (year === previousYear && month === previousMonth);
  const isYearAllowed = (year) =>
    MONTHS.some((_, i) => isMonthAllowed(year, i));

  const isFiltered = filterMonth !== now.getMonth() || filterYear !== now.getFullYear();
  const resetFilters = () => {
    setFilterMonth(now.getMonth());
    setFilterYear(now.getFullYear());
  };

  // Clear the previously generated batch whenever the modal closes so reopening
  // doesn't re-mount VoucherPrinter with stale data and auto-trigger the PDF.
  useEffect(() => {
    if (!open) {
      setGeneratedVouchers([]);
      setLoading(false);
    }
  }, [open]);

  const handleBulkGenerate = async () => {
    if (!bulkClass) return toast.error("Select a class");
    const structure = structures.find(s => s.className === bulkClass);
    if (!structure) return toast.error("No fee structure found");

    const studentsInClass = students.filter(s => s.class === bulkClass);
    const studentIdsInClass = studentsInClass.map(s => s.id);
    const baseFee = (structure.tuition || 0) + (structure.exam || 0) + (structure.transport || 0) + (structure.schoolFee || 0) + (structure.admissionFee || 0) + (structure.annualFund || 0) + (structure.courseFee || 0) + (structure.fees?.reduce((sum, f) => sum + f.amount, 0) || 0);

    const vouchersData = studentsInClass.map(student => {
      const arrears = includeArrears ? calculateArrears(student.id) : 0;
      const { lateFine } = getLateDetails(bulkDueDate, student.id);
      const totalDisc = (student.discounts?.reduce((sum, d) => sum + d.amount, 0) || 0) + (student.tuitionDiscount || 0) + (student.examDiscount || 0) + (student.transportDiscount || 0);

      return {
        studentId: student.id, month: bulkMonth, dueDate: new Date(bulkDueDate), amount: baseFee, arrears, fine: lateFine,
        discount: totalDisc, totalPayable: baseFee + arrears + lateFine - totalDisc, paidAmount: 0, status: "UNPAID",
        tuitionDiscount: student.tuitionDiscount || 0, examDiscount: student.examDiscount || 0, transportDiscount: student.transportDiscount || 0,
      };
    });

    setLoading(true);
    const bulkPromise = addBulk(vouchersData);
    toast.promise(bulkPromise, {
      loading: `Generating ${vouchersData.length} vouchers...`,
      success: (newlyCreated) => {
        const created = Array.isArray(newlyCreated) ? newlyCreated : [];
        // Only print the vouchers that were freshly created in this run — never
        // re-print pre-existing ones, otherwise the PDF would mislead the user
        // into thinking duplicates were generated.
        const order = new Map(studentIdsInClass.map((id, i) => [id, i]));
        const sorted = [...created].sort(
          (a, b) => (order.get(a.studentId) ?? 9999) - (order.get(b.studentId) ?? 9999)
        );
        setGeneratedVouchers(sorted);
        setLoading(false);

        const skipped = vouchersData.length - created.length;
        if (skipped > 0) {
          return `Generated ${created.length} new voucher${created.length === 1 ? "" : "s"} · ${skipped} student${skipped === 1 ? "" : "s"} already had vouchers and were skipped.`;
        }
        return `Generated ${created.length} voucher${created.length === 1 ? "" : "s"}`;
      },
      error: (err) => {
        setLoading(false);
        const serverMsg = err?.response?.data?.error;
        if (serverMsg && /already generated/i.test(serverMsg)) {
          return `Vouchers for ${bulkClass} have already been generated for ${bulkMonth}. Nothing new to create.`;
        }
        if (serverMsg) return serverMsg;
        if (err?.message === "Network Error") return "Couldn't reach the server. Check your connection and try again.";
        return "Bulk generation failed. Please try again.";
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[98vw] sm:max-w-140 p-0 overflow-hidden max-h-[95vh] flex flex-col shadow-xl border border-slate-200 rounded-xl bg-white">
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm"><Layers size={24} /></div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Bulk Voucher Generation</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">Generate monthly fee vouchers for an entire class.</DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white space-y-8">
          <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="space-y-1.5 sm:flex-1 sm:min-w-0">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Class</Label>
                <Select value={bulkClass} onValueChange={setBulkClass}>
                  <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl w-full"><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent className="rounded-xl">{structures.map(s => <SelectItem key={s.id} value={s.className}>{s.className}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:shrink-0">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Voucher Month</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Calendar size={16} className="text-slate-400 shrink-0" />
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                    className="flex-1 sm:flex-none bg-white border border-slate-200 rounded-lg text-xs font-bold h-11 px-3 outline-none hover:border-slate-300 transition-colors min-w-25"
                  >
                    {MONTHS.map((m, i) => (
                      <option
                        key={i}
                        value={i}
                        disabled={!isMonthAllowed(filterYear, i)}
                      >
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(parseInt(e.target.value))}
                    className="flex-none bg-white border border-slate-200 rounded-lg text-xs font-bold h-11 px-3 outline-none hover:border-slate-300 transition-colors"
                  >
                    {years.map((y) => (
                      <option key={y} value={y} disabled={!isYearAllowed(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                  {isFiltered && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={resetFilters}
                      className="h-11 w-11 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg animate-in fade-in zoom-in duration-300"
                      title="Reset to current month"
                    >
                      <RotateCcw size={16} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Due Date</Label>
              <Input type="date" className="h-11 bg-white border-slate-200 rounded-xl" value={bulkDueDate} onChange={(e) => setBulkDueDate(e.target.value)} />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border bg-white/60 border-emerald-100">
              <div className="flex flex-col">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Include Previous Dues?</Label>
                <span className="text-[9px] text-slate-400 font-medium mt-1">Enable to carry forward outstanding balance</span>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" checked={includeArrears} onChange={(e) => setIncludeArrears(e.target.checked)} />
            </div>

            {generatedVouchers.length > 0 && generatedVouchers[0].month === bulkMonth ? (
              <div className="space-y-3">
                <VoucherPrinter vouchersToPrint={generatedVouchers} students={students} />
                <div className="w-full h-12 flex items-center justify-center bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-bold animate-in fade-in zoom-in-95 duration-300">
                  <Check className="w-5 h-5 mr-2" /> {generatedVouchers.length} Vouchers Generated & Printed
                </div>
              </div>
            ) : (
              <Button onClick={handleBulkGenerate} disabled={loading || !bulkClass} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]">
                <Layers className="mr-2 h-4 w-4" /> {loading ? "Generating..." : "Generate Vouchers for Class"}
              </Button>
            )}
          </div>
          <div className="h-40 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center bg-slate-50 text-center px-6 border-slate-200">
            <Receipt size={40} className="text-slate-200 mb-3" />
            <p className="text-slate-500 font-bold text-sm tracking-tight">Bulk Generator Ready</p>
            <p className="text-slate-400 text-[11px] mt-1.5">Vouchers will appear in the Collection tab.</p>
          </div>
        </div>
        <div className="px-6 py-5 border-t bg-slate-50 flex justify-end shrink-0">
          <Button variant="ghost" onClick={() => setOpen(false)} className="h-11 px-8 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}