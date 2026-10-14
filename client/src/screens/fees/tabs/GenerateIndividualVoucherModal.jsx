import { useState, useMemo, useEffect } from "react"
import { Printer, Search, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import VoucherPrinter from "../VoucherPrinter"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStudents } from "@/context/StudentContext"
import { useFeeStructures } from "@/context/FeeStructureContext"
import { useVouchers } from "@/context/VoucherContext"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useNumericInput } from "@/hooks/useNumericInput"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

const getCurrentMonthYear = () => {
  const now = new Date();
  return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

const getDefaultDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return date.toISOString().split("T")[0];
};

export default function GenerateIndividualVoucherModal({ open, setOpen }) {
  const { students } = useStudents();
  const { structures } = useFeeStructures();
  const { vouchers, addVoucher, calculateArrears, getLateDetails, nextVoucherNumber } = useVouchers();
  const [loading, setLoading] = useState(false);
  const [generatedVouchers, setGeneratedVouchers] = useState([]);
  const { sanitize } = useNumericInput();

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [formData, setFormData] = useState({
    studentId: "",
    month: getCurrentMonthYear(),
    dueDate: getDefaultDueDate(),
    amount: 0,
    arrears: 0,
    fine: 0,
    discount: 0,
    tuitionDiscount: 0,
    examDiscount: 0,
    transportDiscount: 0,
  });

  const [includeArrears, setIncludeArrears] = useState(true);

  const searchResults = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const term = studentSearch.toLowerCase();
    return students.filter(s =>
      s.regNumber?.toString().includes(term) ||
      s.rollNumber?.toString().includes(term)
    ).slice(0, 6);
  }, [students, studentSearch]);

  const handleSelectStudent = (student) => {
    setFormData(prev => ({ ...prev, studentId: student.id }));
    setSelectedClass(student.class);
    setStudentSearch("");
    setGeneratedVouchers([]);
  };

  const totalPayable = useMemo(() => {
    const amount = Number(formData.amount) || 0;
    const arrears = Number(formData.arrears) || 0;
    const fine = Number(formData.fine) || 0;
    const discount = Number(formData.discount) || 0;
    const net = amount + arrears + fine - discount;
    return Math.max(0, net);
  }, [formData.amount, formData.arrears, formData.fine, formData.discount]);

  const discountBreakdown = useMemo(() => {
    const catTotal = (Number(formData.tuitionDiscount) || 0) + 
                     (Number(formData.examDiscount) || 0) + 
                     (Number(formData.transportDiscount) || 0);
    const predefined = Math.max(0, (Number(formData.discount) || 0) - catTotal);
    return { catTotal, predefined };
  }, [formData.discount, formData.tuitionDiscount, formData.examDiscount, formData.transportDiscount]);

  const alreadyGenerated = useMemo(() => {
    if (!formData.studentId || !formData.month) return false;
    return vouchers.some(v => 
      String(v.studentId).toLowerCase() === String(formData.studentId).toLowerCase() && 
      v.month === formData.month
    );
  }, [vouchers, formData.studentId, formData.month]);

  const currentStudentVouchers = useMemo(() => {
    if (!formData.studentId || !vouchers) return [];
    return vouchers.filter((v) => String(v.studentId) === String(formData.studentId));
  }, [vouchers, formData.studentId]);

  const unpaidMonthCount = useMemo(() => {
    return currentStudentVouchers.filter((v) => v.status !== "PAID").length;
  }, [currentStudentVouchers]);

  useEffect(() => {
    if (unpaidMonthCount > 3) setIncludeArrears(true);
  }, [unpaidMonthCount]);

  useEffect(() => {
    if (formData.studentId && students.length > 0) {
      const student = students?.find(s => s.id === formData.studentId);
      if (!student) return;
      const structure = structures.find(s => s.className === selectedClass);
      const baseFee = (structure?.tuition || 0) + (structure?.exam || 0) + (structure?.transport || 0) + (structure?.fees?.reduce((sum, f) => sum + f.amount, 0) || 0);
      const studentArrears = includeArrears ? calculateArrears(formData.studentId) : 0;
      const { lateFine } = getLateDetails(formData.dueDate, formData.studentId);
      const predefinedTotal = student?.discounts?.reduce((sum, d) => sum + d.amount, 0) || 0;
      const totalDisc = predefinedTotal + (student.tuitionDiscount || 0) + (student.examDiscount || 0) + (student.transportDiscount || 0);

      setFormData(prev => ({
        ...prev, 
        amount: baseFee, arrears: Number(studentArrears), fine: Number(lateFine), discount: totalDisc,
        tuitionDiscount: student.tuitionDiscount || 0, examDiscount: student.examDiscount || 0, transportDiscount: student.transportDiscount || 0
      }));
    }
  }, [formData.studentId, includeArrears, formData.dueDate, students, structures]);

  const handleGenerate = async () => {
    setLoading(true);
    const savePromise = addVoucher({ ...formData, totalPayable: Number(totalPayable), paidAmount: 0, status: "UNPAID" });
    toast.promise(savePromise, {
      loading: "Generating voucher...",
      success: (v) => { setGeneratedVouchers([v]); setLoading(false); return "Voucher Generated"; },
      error: (err) => { setLoading(false); return err.response?.data?.error || "Failed"; }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[98vw] sm:max-w-160 p-0 overflow-hidden max-h-[95vh] flex flex-col shadow-xl border border-slate-200 rounded-xl bg-white">
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm"><Printer size={24} /></div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Individual Fee Voucher</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">Generate monthly fee voucher for a single student.</DialogDescription>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white space-y-6">
          <div className="space-y-2 relative">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Search Student (Reg# or Roll#)</Label>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Type registration or roll number..." className="pl-10 h-12 bg-slate-50 rounded-xl" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-2 overflow-hidden">
                {searchResults.map((s) => (
                  <button key={s.id} className="w-full text-left px-5 py-3 hover:bg-slate-50 flex justify-between items-center" onClick={() => handleSelectStudent(s)}>
                    <div><p className="font-bold text-slate-700">{s.firstName} {s.lastName}</p><p className="text-[10px] text-slate-400 uppercase font-bold">Class: {s.class}</p></div>
                    <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">#{s.rollNumber}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {formData.studentId && (
            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">{students.find(s => s.id === formData.studentId)?.firstName.charAt(0)}</div>
                <div><p className="font-bold text-emerald-900 leading-none">{students.find(s => s.id === formData.studentId)?.firstName} {students.find(s => s.id === formData.studentId)?.lastName}</p><p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">Class: {selectedClass}</p></div>
              </div>
              <button onClick={() => setFormData(prev => ({ ...prev, studentId: "" }))} className="p-2 hover:bg-emerald-100 rounded-full text-emerald-400 transition-colors"><X className="h-4 w-4" /></button>
            </div>
          )}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Next Voucher Number</span>
            <span className="text-xs font-mono font-black text-emerald-600">{formData.studentId ? nextVoucherNumber : "—"}</span>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Due Date</Label><Input type="date" className="h-11 bg-slate-50 rounded-xl" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Monthly Fee</Label>
              <Input 
                type="text" 
                inputMode="numeric" 
                className="h-11 bg-slate-50 rounded-xl" 
                value={formData.amount} 
                onChange={(e) => {
                  const num = sanitize(e.target.value);
                  if (num !== null) setFormData({ ...formData, amount: num });
            }} /></div>
          </div>
          <div className={cn("flex items-center justify-between p-4 rounded-xl border transition-all", includeArrears ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-100")}>
            <div className="flex flex-col"><Label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Include Previous Dues?</Label>{unpaidMonthCount > 3 ? <span className="text-[9px] text-red-600 font-bold uppercase mt-1">Required: 3+ Months Unpaid</span> : <span className="text-[9px] text-slate-400 font-medium mt-1">Enable to carry forward outstanding balance</span>}</div>
            <input type="checkbox" className="h-5 w-5 rounded-lg border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer" checked={includeArrears} onChange={(e) => setIncludeArrears(e.target.checked)} disabled={unpaidMonthCount > 3} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Tuition Disc.</Label>
              <Input 
                type="text" 
                inputMode="numeric" 
                className="h-10 bg-white border-slate-200 rounded-xl text-sm" 
                value={formData.tuitionDiscount} 
                onChange={(e) => {
                  const val = sanitize(e.target.value);
                  if (val !== null) {
                    setFormData(prev => ({ ...prev, tuitionDiscount: val, discount: prev.discount + (val - prev.tuitionDiscount) }));
                  }
              }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Exam Disc.</Label>
              <Input 
                type="text" 
                inputMode="numeric" 
                className="h-10 bg-white border-slate-200 rounded-xl text-sm" 
                value={formData.examDiscount} 
                onChange={(e) => {
                  const val = sanitize(e.target.value);
                  if (val !== null) {
                    setFormData(prev => ({ ...prev, examDiscount: val, discount: prev.discount + (val - prev.examDiscount) }));
                  }
              }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Trans. Disc.</Label>
              <Input 
                type="text" 
                inputMode="numeric" 
                className="h-10 bg-white border-slate-200 rounded-xl text-sm" 
                value={formData.transportDiscount} 
                onChange={(e) => {
                  const val = sanitize(e.target.value);
                  if (val !== null) {
                    setFormData(prev => ({ ...prev, transportDiscount: val, discount: prev.discount + (val - prev.transportDiscount) }));
                  }
              }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pb-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Arrears</Label>
              <Input 
                type="text" 
                inputMode="numeric" 
                className="h-11 bg-slate-50 rounded-xl" 
                value={formData.arrears} 
                onChange={(e) => {
                  const num = sanitize(e.target.value);
                  if (num !== null) setFormData({ ...formData, arrears: num });
            }} disabled={!includeArrears} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Fine</Label>
              <Input 
                type="text" 
                inputMode="numeric" 
                className="h-11 bg-slate-50 rounded-xl" 
                value={formData.fine} 
                onChange={(e) => {
                  const num = sanitize(e.target.value);
                  if (num !== null) setFormData({ ...formData, fine: num });
            }} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Total Discount</Label>
              <div className="relative">
                <Input 
                  type="text" 
                  inputMode="numeric" 
                  className="h-11 bg-emerald-50 border-emerald-100 font-bold text-emerald-700 rounded-xl" 
                  value={formData.discount} 
                  onChange={(e) => {
                    const num = sanitize(e.target.value);
                    if (num !== null) setFormData({ ...formData, discount: num });
                  }} 
                />
                <div className="absolute -bottom-6 left-0 right-0 flex justify-between px-1">
                  <span className="text-[8px] font-black uppercase text-slate-400">Fixed: Rs.{discountBreakdown.predefined}</span>
                  <span className="text-[8px] font-black uppercase text-emerald-500">Heads: Rs.{discountBreakdown.catTotal}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 bg-slate-900 rounded-xl flex justify-between items-center shadow-lg shadow-slate-200">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Payable:</span>
            <span className="text-2xl font-black text-white">Rs. {totalPayable.toLocaleString()}</span>
          </div>
          {formData.studentId && generatedVouchers.length === 1 ? (
            <div className="space-y-3">
              <VoucherPrinter vouchersToPrint={generatedVouchers} students={students} />
              <div className="w-full h-12 flex items-center justify-center bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-bold animate-in fade-in zoom-in-95 duration-300">
                <Check className="w-5 h-5 mr-2" /> Voucher Generated & Printed
              </div>
            </div>
          ) : (
            <Button onClick={handleGenerate} disabled={loading || !formData.studentId || alreadyGenerated} className={cn("w-full h-12 font-bold rounded-xl", alreadyGenerated ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20")}>
              <Printer className="mr-2 h-4 w-4" /> {alreadyGenerated ? "Already Generated" : (loading ? "Generating..." : "Generate Voucher")}
            </Button>
          )}
        </div>
        <div className="px-6 py-5 border-t bg-slate-50 flex justify-end shrink-0">
          <Button variant="ghost" onClick={() => setOpen(false)} className="h-11 px-8 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}