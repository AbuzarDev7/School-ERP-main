import { useState, useMemo, useEffect } from "react"
import { Printer, Receipt, Layers, Search, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import VoucherPrinter from "../VoucherPrinter"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useStudents } from "@/context/StudentContext"
import { useFeeStructures } from "@/context/FeeStructureContext"
import { useVouchers } from "@/context/VoucherContext"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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

export default function GenerateVoucherTab({ open, setOpen }) {
  const { students } = useStudents();
  const { structures } = useFeeStructures();
  const { vouchers, setVouchers, addVoucher, addBulk, calculateArrears, getLateDetails, nextVoucherNumber } = useVouchers();
  const [loading, setLoading] = useState(false);
  const [generatedVouchers, setGeneratedVouchers] = useState([]);

  // Individual Form States
  const [selectedClass, setSelectedClass] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [formData, setFormData] = useState({
    studentId: "",
    month: getCurrentMonthYear(),
    dueDate: getDefaultDueDate(),
    amount: 0,
    arrears: 0,
    fine: 0,
    discount: 0, // Total discount, will be calculated from categorical
    tuitionDiscount: 0,
    examDiscount: 0,
    transportDiscount: 0,
  });

  const [includeArrears, setIncludeArrears] = useState(true);

  // Bulk Generation States
  const [bulkClass, setBulkClass] = useState("");
  const [bulkMonth, setBulkMonth] = useState(getCurrentMonthYear());
  const [bulkDueDate, setBulkDueDate] = useState(getDefaultDueDate());

  const availableMonths = useMemo(() => {
    const allMonths = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return allMonths.slice(0, new Date().getMonth() + 1);
  }, []);

  // --- Logic Helpers ---
  const getFeeStructureForClass = (className) => {
    return structures.find(s => s.className === className);
  };

  const searchResults = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const term = studentSearch.toLowerCase();
    return students.filter(s =>
      s.regNumber?.toString().includes(term) ||
      s.rollNumber?.toString().includes(term)
    ).slice(0, 6);
  }, [students, studentSearch]);

  const handleSelectStudent = (student) => {
    setFormData(prev => ({
      ...prev,
      studentId: student.id
    }));
    setSelectedClass(student.class);
    setStudentSearch(""); // Clear search after selection
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

  // Get all vouchers for the selected student once
  const currentStudentVouchers = useMemo(() => {
    if (!formData.studentId || !vouchers) return [];
    const sId = String(formData.studentId).trim().toLowerCase();
    return vouchers.filter((v) => String(v.studentId).trim().toLowerCase() === sId);
  }, [vouchers, formData.studentId]);

  // Calculate unpaid month count for the selected student
  const unpaidMonthCount = useMemo(() => {
    return currentStudentVouchers.filter((v) => v.status !== "PAID").length;
  }, [currentStudentVouchers]);

  // Force toggle to true if dues exceed 3 months
  useEffect(() => {
    if (unpaidMonthCount > 3) {
      setIncludeArrears(true);
    }
  }, [unpaidMonthCount]);

  // Clear generated vouchers when form data changes
  useEffect(() => {
    setGeneratedVouchers([]);
  }, [formData.studentId, formData.month, bulkClass, bulkMonth]);

  // Auto-set fees and arrears when student is selected
  useEffect(() => {
    // Only calculate if we have a student selected and the necessary data is loaded
    if (formData.studentId && students.length > 0 && typeof calculateArrears === 'function') {
      const student = students?.find(s => String(s.id).trim().toLowerCase() === String(formData.studentId).trim().toLowerCase());
      if (!student) return;

      const structure = getFeeStructureForClass(selectedClass);
      const baseFee =
        (structure?.tuition || 0) +
        (structure?.exam || 0) +
        (structure?.transport || 0) +
        (structure?.schoolFee || 0) +
        (structure?.admissionFee || 0) +
        (structure?.annualFund || 0) +
        (structure?.courseFee || 0) +
        (structure?.fees?.reduce((sum, f) => sum + f.amount, 0) || 0);
      
      // Always fetch the absolute current outstanding balance for the form
      const studentArrears = includeArrears ? calculateArrears(formData.studentId) : 0;
      const { lateFine } = getLateDetails(formData.dueDate, formData.studentId);
      
      // Sum of predefined discounts and categorical discounts from student profile
      const predefinedDiscountsTotal = student?.discounts?.reduce((sum, d) => sum + d.amount, 0) || 0;
      const studentTuitionDiscount = student?.tuitionDiscount || 0;
      const studentExamDiscount = student?.examDiscount || 0;
      const studentTransportDiscount = student?.transportDiscount || 0;
      
      // We store the sum in 'discount' as the master total for calculation
      const totalDiscount = Number(predefinedDiscountsTotal) + Number(studentTuitionDiscount) + Number(studentExamDiscount) + Number(studentTransportDiscount);

      setFormData(prev => {
        // If data hasn't changed, return previous state to avoid infinite loops/flicker
        if (
          prev.studentId === formData.studentId && 
          prev.arrears === Number(studentArrears) && 
          prev.amount === baseFee && 
          prev.fine === Number(lateFine) &&
          prev.tuitionDiscount === studentTuitionDiscount &&
          prev.examDiscount === studentExamDiscount &&
          prev.transportDiscount === studentTransportDiscount
        ) {
          return prev;
        }

        return {
          ...prev, 
          amount: baseFee, 
          arrears: Number(studentArrears) || 0, 
          fine: Number(lateFine) || 0, 
          discount: totalDiscount,
          tuitionDiscount: studentTuitionDiscount,
          examDiscount: studentExamDiscount,
          transportDiscount: studentTransportDiscount
        };
      });
    }
  }, [formData.studentId, formData.month, selectedClass, vouchers, calculateArrears, includeArrears, getLateDetails, formData.dueDate, students, structures]);

  // --- Handlers ---
  const handleGenerate = async () => {
    if (!formData.studentId) return toast.error("Please select a student");
    setLoading(true);

    const savePromise = addVoucher({
      ...formData,
      totalPayable: Number(totalPayable),
      paidAmount: 0,
      status: "UNPAID",
      tuitionDiscount: formData.tuitionDiscount,
      examDiscount: formData.examDiscount,
      transportDiscount: formData.transportDiscount,
    });

    toast.promise(savePromise, {
      loading: "Generating voucher...",
      success: (newVoucher) => {
        setLoading(false);
        setGeneratedVouchers([newVoucher]);
        return "Voucher Generated Successfully";
      },
      error: (err) => {
        setLoading(false);
        return err.response?.data?.error || "Generation failed";
      }
    });
  };

  const handleBulkGenerate = async () => {
    if (!bulkClass) return toast.error("Select a class");

    const classFeeStructure = getFeeStructureForClass(bulkClass);
    if (!classFeeStructure) return toast.error("No fee structure found for this class");

    const studentsInClass = students.filter(s => s.class === bulkClass);
    const totalFee =
      (classFeeStructure.tuition || 0) +
      (classFeeStructure.exam || 0) +
      (classFeeStructure.transport || 0) +
      (classFeeStructure.schoolFee || 0) +
      (classFeeStructure.admissionFee || 0) +
      (classFeeStructure.annualFund || 0) +
      (classFeeStructure.courseFee || 0) +
      (classFeeStructure.fees?.reduce((sum, f) => sum + f.amount, 0) || 0);

    const vouchersData = studentsInClass.map(student => {
      // Enforce strictness per student in bulk mode
      const sUnpaidCount = vouchers.filter(v =>
        String(v.studentId).trim().toLowerCase() === String(student.id).trim().toLowerCase() &&
        v.status !== 'PAID'
      ).length;

      // Arrears in bulk mode also made independent of month for consistency
      const arrears = (includeArrears || sUnpaidCount > 3) ? calculateArrears(student.id) : 0;
      const { lateFine } = getLateDetails(bulkDueDate, student.id);

      const predefinedDiscountsTotal = student.discounts?.reduce((sum, d) => sum + d.amount, 0) || 0;
      const studentTuitionDiscount = student.tuitionDiscount || 0;
      const studentExamDiscount = student.examDiscount || 0;
      const studentTransportDiscount = student.transportDiscount || 0;

      return {
        studentId: student.id,
        month: bulkMonth,
        dueDate: new Date(bulkDueDate),
        amount: totalFee,
        arrears,
        fine: lateFine,
        discount: predefinedDiscountsTotal + studentTuitionDiscount + studentExamDiscount + studentTransportDiscount, // Total discount
        tuitionDiscount: studentTuitionDiscount,
        examDiscount: studentExamDiscount,
        transportDiscount: studentTransportDiscount,
        totalPayable: totalFee + arrears + lateFine - totalDiscount,
        paidAmount: 0,
        status: "UNPAID"
      };
    });

    setLoading(true);
    const bulkPromise = addBulk(vouchersData);

    toast.promise(bulkPromise, {
      loading: `Generating ${vouchersData.length} vouchers...`,
      success: (newVouchers) => {
        setLoading(false);
        setGeneratedVouchers(newVouchers);
        return `${newVouchers.length} vouchers generated successfully`;
      },
      error: (err) => {
        setLoading(false);
        return err.response?.data?.error || "Bulk generation failed";
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[98vw] sm:max-w-250 p-0 overflow-hidden max-h-[95vh] flex flex-col shadow-xl border border-slate-200 rounded-xl bg-white">
        
        {/* Header */}
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Receipt size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Generate Fee Vouchers</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
                Generate monthly fee vouchers for individual students or entire classes.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* LEFT COLUMN: FORMS */}
            <div className="lg:col-span-6 space-y-8">
        {/* INDIVIDUAL GENERATION CARD */}
              <section className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Individual Fee Voucher</h3>
                </div>
                
            {/* SEARCH BAR */}
                <div className="space-y-2 relative">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Search Student (Reg# or Roll#)</Label>
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <Input
                      placeholder="Type registration or roll number..."
                      className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      {searchResults.map((s) => (
                        <button
                          key={s.id}
                          className="w-full text-left px-5 py-3 hover:bg-slate-50 flex justify-between items-center transition-colors border-b last:border-0 border-slate-100"
                          onClick={() => handleSelectStudent(s)}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{s.firstName} {s.lastName}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Class: {s.class}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">#{s.rollNumber}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* SELECTED STUDENT BADGE */}
                {formData.studentId && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {students.find(s => s.id === formData.studentId)?.firstName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-blue-900 leading-none">
                          {students.find(s => s.id === formData.studentId)?.firstName} {students.find(s => s.id === formData.studentId)?.lastName}
                        </p>
                        <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">Class: {selectedClass}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, studentId: "" }))}
                      className="p-2 hover:bg-blue-100 rounded-full text-blue-400 hover:text-blue-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* NEXT VOUCHER PREVIEW */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Next Voucher Number</span>
                  <span className="text-xs font-mono font-black text-blue-600">
                    {formData.studentId ? nextVoucherNumber : "—"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Due Date</Label>
                    <Input type="date" className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Monthly Fee</Label>
                    <Input type="number" className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} />
                  </div>
                </div>

                {/* Arrears Control Toggle */}
                <div className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-all",
                  includeArrears ? "bg-amber-50 border-amber-200 shadow-sm" : "bg-slate-50 border-slate-100"
                )}>
                  <div className="flex flex-col">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Include Previous Dues?</Label>
                    {unpaidMonthCount > 3 ? (
                      <span className="text-[9px] text-red-600 font-bold uppercase mt-1">Required: 3+ Months Unpaid</span>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-medium mt-1">Enable to carry forward outstanding balance</span>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded-lg border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    checked={includeArrears}
                    onChange={(e) => setIncludeArrears(e.target.checked)}
                    disabled={unpaidMonthCount > 3}
                  />
                </div>

                {/* Categorical Discounts */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Tuition Disc.</Label>
                    <Input 
                      type="number" 
                      className="h-10 bg-white border-slate-200 focus:ring-blue-500 rounded-xl text-sm" 
                      value={formData.tuitionDiscount} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData(prev => ({ ...prev, tuitionDiscount: val, discount: prev.discount + (val - prev.tuitionDiscount) }));
                      }} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Exam Disc.</Label>
                    <Input 
                      type="number" 
                      className="h-10 bg-white border-slate-200 focus:ring-blue-500 rounded-xl text-sm" 
                      value={formData.examDiscount} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData(prev => ({ ...prev, examDiscount: val, discount: prev.discount + (val - prev.examDiscount) }));
                      }} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Trans. Disc.</Label>
                    <Input 
                      type="number" 
                      className="h-10 bg-white border-slate-200 focus:ring-blue-500 rounded-xl text-sm" 
                      value={formData.transportDiscount} 
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData(prev => ({ ...prev, transportDiscount: val, discount: prev.discount + (val - prev.transportDiscount) }));
                      }} 
                    />
                  </div>
                </div>

                {/* Arrears, Fine, and Total Discount Fields */}
                <div className="grid grid-cols-3 gap-4 pb-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Arrears</Label>
                    <Input type="number" className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl" value={formData.arrears} onChange={(e) => setFormData({ ...formData, arrears: Number(e.target.value) })} disabled={!includeArrears} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Fine</Label>
                    <Input type="number" className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl" value={formData.fine} onChange={(e) => setFormData({ ...formData, fine: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Total Discount</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        className="h-11 bg-blue-50 border-blue-100 font-bold text-blue-700 rounded-xl" 
                        value={formData.discount} 
                        onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                      />
                      <div className="absolute -bottom-6 left-0 right-0 flex justify-between px-1">
                        <span className="text-[8px] font-black uppercase text-slate-400">Fixed: Rs.{discountBreakdown.predefined}</span>
                        <span className="text-[8px] font-black uppercase text-blue-500">Heads: Rs.{discountBreakdown.catTotal}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2" />

                <div className="p-5 bg-slate-900 rounded-xl flex justify-between items-center shadow-lg shadow-slate-200">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Payable:</span>
                  <span className="text-2xl font-black text-white">Rs. {totalPayable.toLocaleString()}</span>
                </div>

                {formData.studentId && generatedVouchers.length === 1 && generatedVouchers[0].studentId === formData.studentId ? (
                  <VoucherPrinter vouchersToPrint={generatedVouchers} students={students} />
                ) : (
                  <Button 
                    onClick={handleGenerate} 
                    disabled={loading || !formData.studentId || alreadyGenerated} 
                    className={cn("w-full h-12 font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]", alreadyGenerated ? "bg-slate-200 text-slate-500 cursor-not-allowed shadow-none" : "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20")}
                  >
                    <Printer className="mr-2 h-4 w-4" /> {alreadyGenerated ? "Voucher Already Generated" : (loading ? "Generating..." : "Generate Voucher")}
                  </Button>
                )}
              </section>
            </div>

            {/* RIGHT COLUMN: BULK GENERATION */}
            <div className="lg:col-span-6 space-y-8">
              <section className="space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Bulk Generation</h3>
                </div>

                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-6">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Class</Label>
                      <Select value={bulkClass} onValueChange={setBulkClass}>
                        <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl">
                          <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {structures.map(s => <SelectItem key={s.id} value={s.className}>{s.className}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Month</Label>
                      <Select value={bulkMonth} onValueChange={setBulkMonth}>
                        <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl">
                          <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {availableMonths.map((m) => (
                            <SelectItem key={m} value={`${m} ${new Date().getFullYear()}`}>
                              {m} {new Date().getFullYear()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Due Date</Label>
                    <Input type="date" className="h-11 bg-white border-slate-200 rounded-xl" value={bulkDueDate} onChange={(e) => setBulkDueDate(e.target.value)} />
                  </div>

                  <div className="p-4 bg-white/60 rounded-xl border border-blue-100/50">
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight mb-1 flex items-center gap-1.5">
                      <Layers className="w-3 h-3" /> Note
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      This will generate unpaid vouchers for all students in the selected class. Existing unpaid balances (Arrears) will be automatically included.
                    </p>
                  </div>

                  {generatedVouchers.length > 0 && generatedVouchers[0].month === bulkMonth && students.some(s => s.class === bulkClass && s.id === generatedVouchers[0].studentId) ? (
                    <VoucherPrinter vouchersToPrint={generatedVouchers} students={students} />
                  ) : (
                    <Button 
                      onClick={handleBulkGenerate} 
                      disabled={loading || !bulkClass} 
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                    >
                      <Layers className="mr-2 h-4 w-4" /> {loading ? "Generating..." : "Generate Vouchers for Class"}
                    </Button>
                  )}
                </div>
              </section>

              {/* PREVIEW PLACEHOLDER */}
              <div className="h-62.5 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center bg-slate-50 text-center px-6 border-slate-200">
                <Receipt size={40} className="text-slate-200 mb-3" />
                <p className="text-slate-500 font-bold text-sm tracking-tight">Voucher Generator Ready</p>
                <p className="text-slate-400 text-[11px] mt-1.5 max-w-50">
                  Generated vouchers will appear in the <strong>Fee Collection</strong> tab for processing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-5 border-t bg-slate-50 flex justify-end shrink-0">
          <Button variant="ghost" onClick={() => setOpen(false)} className="h-11 px-8 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}