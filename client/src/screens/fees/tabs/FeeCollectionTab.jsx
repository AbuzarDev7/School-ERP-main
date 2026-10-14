import { useState, useMemo, useEffect, useRef } from "react"
import { Search, CheckCircle2, ChevronLeft, ChevronRight, Pencil, Trash2, History, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useStudents } from "@/context/StudentContext"
import { useVouchers } from "@/context/VoucherContext"
import { useFeeStructures } from "@/context/FeeStructureContext"
import { usePaymentMethods } from "@/context/PaymentMethodContext"
import { useSettings } from "@/context/SettingsContext"
import { toast } from "sonner"
import { printFeeReceipt } from "../FeeReceiptPrinter"
import { printThermalVoucher } from "../ThermalVoucherPrinter"
import EditVoucherModal from "./EditVoucherModal"
import StudentHistoryModal from "./StudentHistoryModal"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function FeeCollectionTab() {
  const { students } = useStudents()
  const { vouchers, updateVoucher, editVoucher, deleteVoucher, getLateDetails, addBulk, calculateArrears } = useVouchers()
  const { structures } = useFeeStructures()
  const { activeMethods, refresh: refreshPaymentMethods } = usePaymentMethods()
  const { brand } = useSettings()
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")
  // Default the status filter to UNPAID — cashiers come to this tab to collect,
  // so the unpaid + partial buckets are what they need to see first. PAID
  // rows are still reachable via the filter toggle.
  const [statusFilter, setStatusFilter] = useState("UNPAID") // ALL | UNPAID | PAID
  const [classFilter, setClassFilter] = useState("all") // "all" | className
  const [paymentDetails, setPaymentDetails] = useState({
    method: "",
    transactionId: "",
    amountToPay: 0
  })

  // Edit / delete / history modal state
  const [editingVoucher, setEditingVoucher] = useState(null)
  const [deletingVoucher, setDeletingVoucher] = useState(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  // Guard so we don't fire the auto-generator multiple times within a single
  // mount (useEffect re-runs when vouchers/students/structures hydrate).
  const autoGenAttemptedRef = useRef(false);

  const currentMonthLabel = useMemo(() => {
    const now = new Date();
    return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  const classList = useMemo(
    () => structures.map((s) => s.className),
    [structures]
  );

  // Auto-generate the current month's vouchers whenever this tab mounts and
  // any active student is missing their voucher. The server's
  // @@unique([studentId, month]) makes the call idempotent, and the
  // eligibility check below means we only hit the server when there's
  // genuinely something to create — so mid-month student registrations get
  // picked up the next time someone opens this tab.
  useEffect(() => {
    if (autoGenAttemptedRef.current) return;
    if (!students.length || !structures.length) return; // Wait for data to hydrate

    // If any voucher for the current month already covers an active student,
    // skip generation for them — only fill in the gaps. New mid-month
    // admissions get auto-billed without re-billing existing students.
    const existingStudentIds = new Set(
      vouchers.filter((v) => v.month === currentMonthLabel).map((v) => v.studentId)
    );

    const eligibleStudents = students.filter(
      (s) => s.status === "ACTIVE" && !existingStudentIds.has(s.id)
    );

    if (eligibleStudents.length === 0) return;

    autoGenAttemptedRef.current = true;

    // Default 5-day grace period from generation date — matches the manual
    // bulk modal so cashiers see consistent due dates whether the voucher
    // was auto- or manually-generated.
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);
    dueDate.setHours(0, 0, 0, 0);

    const vouchersData = eligibleStudents
      .map((student) => {
        const structure = structures.find((s) => s.className === student.class);
        if (!structure) return null; // No fee structure for this class — skip silently

        const baseFee =
          (structure.tuition || 0) +
          (structure.exam || 0) +
          (structure.transport || 0) +
          (structure.fees?.reduce((sum, f) => sum + f.amount, 0) || 0);

        const arrears = calculateArrears(student.id);
        const { lateFine } = getLateDetails(dueDate, student.id);
        const totalDisc =
          (student.discounts?.reduce((sum, d) => sum + d.amount, 0) || 0) +
          (student.tuitionDiscount || 0) +
          (student.examDiscount || 0) +
          (student.transportDiscount || 0);

        return {
          studentId: student.id,
          month: currentMonthLabel,
          dueDate,
          amount: baseFee,
          arrears,
          fine: lateFine,
          discount: totalDisc,
          totalPayable: baseFee + arrears + lateFine - totalDisc,
          paidAmount: 0,
          status: "UNPAID",
          tuitionDiscount: student.tuitionDiscount || 0,
          examDiscount: student.examDiscount || 0,
          transportDiscount: student.transportDiscount || 0,
        };
      })
      .filter(Boolean);

    if (vouchersData.length === 0) return;

    const promise = addBulk(vouchersData);
    toast.promise(promise, {
      loading: `Generating ${vouchersData.length} ${currentMonthLabel} voucher${vouchersData.length === 1 ? "" : "s"}...`,
      success: (created) => {
        const count = Array.isArray(created) ? created.length : vouchersData.length;
        return `Auto-generated ${count} voucher${count === 1 ? "" : "s"} for ${currentMonthLabel}`;
      },
      error: (err) => {
        // Allow a retry on a transient failure — but not for the "already
        // generated for all" case, which is a definitive done-state.
        const msg = err?.response?.data?.error || err?.message || "";
        if (/already generated/i.test(msg)) {
          return `${currentMonthLabel} vouchers already exist`;
        }
        autoGenAttemptedRef.current = false;
        return `Auto-generation failed: ${msg || "please try again"}`;
      },
    });
  }, [students, structures, vouchers, currentMonthLabel, addBulk, calculateArrears, getLateDetails]);

  // Edit/delete are gated to "still entirely unpaid" — once any rupee has
  // been collected we can't silently rewrite the underlying figures or the
  // cashbook trail goes out of sync. Mirrors the server-side guard so the
  // button just won't render rather than failing on click.
  const isEditable = (v) => v?.status === "UNPAID" && Number(v?.paidAmount || 0) === 0;

  const handleSaveEdit = async (data) => {
    if (!editingVoucher) return;
    return editVoucher(editingVoucher.id, data);
  };

  const confirmDeleteVoucher = () => {
    if (!deletingVoucher) return;
    const promise = deleteVoucher(deletingVoucher.id);
    setDeletingVoucher(null);
    // deleteVoucher already shows its own success/error toast via VoucherContext.
    return promise;
  };

  const handlePrintThermalVoucher = (voucher) => {
    const student = students.find((s) => s.id === voucher.studentId) || null;
    const { lateFine } = getLateDetails(voucher.dueDate, voucher.studentId);
    const additionalFine = Math.max(0, lateFine - (voucher.fine || 0));
    const calculatedFine = (voucher.fine || 0) + additionalFine;
    const calculatedTotal = voucher.totalPayable + additionalFine;
    printThermalVoucher({
      voucher: { ...voucher, calculatedFine, calculatedTotal },
      student,
      brand,
    });
  };

  const handleOpenCollect = (voucher) => {
    const { lateFine, lateDays } = getLateDetails(voucher.dueDate, voucher.studentId);

    // Calculate incremental fine to avoid double-counting
    const additionalFine = Math.max(0, lateFine - (voucher.fine || 0));
    const totalWithNewFine = voucher.totalPayable + additionalFine;

    setSelectedVoucher({
      ...voucher,
      calculatedFine: (voucher.fine || 0) + additionalFine,
      calculatedTotal: totalWithNewFine,
      lateDays: lateDays,
      additionalFine: additionalFine
    });

    setPaymentDetails({
      method: activeMethods[0]?.name || "",
      transactionId: "",
      amountToPay: totalWithNewFine - (voucher.paidAmount || 0)
    });
    setIsCollectModalOpen(true);
  };

  const confirmPayment = async () => {
    if (!paymentDetails.method) {
      return toast.error("Select a payment method");
    }
    if (Number(paymentDetails.amountToPay) <= 0) {
      return toast.error("Enter an amount to collect");
    }

    const remainingBalance = selectedVoucher.calculatedTotal - (selectedVoucher.paidAmount || 0);
    if (Number(paymentDetails.amountToPay) > remainingBalance) {
      return toast.error(`Amount cannot exceed the total due (₨ ${remainingBalance})`);
    }

    const totalDue = selectedVoucher.calculatedTotal;
    const newPaidTotal = (selectedVoucher.paidAmount || 0) + Number(paymentDetails.amountToPay);
    const newStatus = newPaidTotal >= totalDue ? "PAID" : "PARTIAL";

    // Snapshot what we'll need for the receipt before the modal closes and
    // selectedVoucher is reset.
    const receiptSnapshot = {
      voucher: selectedVoucher,
      student: students.find((s) => s.id === selectedVoucher.studentId) || null,
      paidNow: Number(paymentDetails.amountToPay) || 0,
      paymentMethod: paymentDetails.method,
      transactionId: paymentDetails.transactionId,
      brand,
    };

    const updatePromise = updateVoucher(selectedVoucher.id, {
      status: newStatus,
      paymentMethod: paymentDetails.method,
      transactionId: paymentDetails.transactionId,
      fine: selectedVoucher.calculatedFine,
      totalPayable: selectedVoucher.calculatedTotal,
      paidAmount: newPaidTotal,
      // Optimistic concurrency token: tell the server what we *thought*
      // paidAmount was when the cashier opened this voucher. If another
      // cashier has settled it in the meantime, the server returns 409 and
      // this submission is refused — preventing a "phantom collection"
      // where two devices both record cash for the same voucher.
      expectedPaidAmount: Number(selectedVoucher.paidAmount || 0),
    }).then((res) => {
      refreshPaymentMethods();
      return res;
    });

    toast.promise(updatePromise, {
      loading: "Recording payment...",
      success: () => {
        setIsCollectModalOpen(false);
        // Hand the cashier a thermal-printer slip immediately. Fired only on
        // successful update so a network/race failure doesn't generate a
        // receipt for a payment that wasn't recorded.
        printFeeReceipt(receiptSnapshot);
        return `Collected ₨ ${paymentDetails.amountToPay} into ${paymentDetails.method}`;
      },
      error: (err) => {
        // The 409 case ("just updated by another user") is the expected
        // race outcome. The modal stays open so the cashier can refund
        // the cash they took before retrying — they should NOT just close
        // and pretend it succeeded.
        if (err?.response?.status === 409) {
          return err.response?.data?.error || "This voucher was just updated by another user. Refresh and check before collecting again.";
        }
        return err.response?.data?.error || "Failed to update payment";
      },
    });
  };

  const filteredVouchers = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return vouchers
      .filter((v) => {
        const student = students.find((s) => s.id === v.studentId);
        const studentName = student ? `${student.firstName} ${student.lastName}`.toLowerCase() : "";

        const matchesSearch =
          v.voucherNumber.toLowerCase().includes(search) || studentName.includes(search);

        // UNPAID bucket lumps PARTIAL with UNPAID — both represent money still
        // owed, which is what a cashier filtering for "unpaid" wants to see.
        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "PAID" && v.status === "PAID") ||
          (statusFilter === "UNPAID" && v.status !== "PAID");

        const matchesClass = classFilter === "all" || student?.class === classFilter;

        return matchesSearch && matchesStatus && matchesClass;
      }) // Oldest first, newest at bottom
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [vouchers, searchTerm, students, statusFilter, classFilter]);

  const totalPages = Math.ceil(filteredVouchers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedVouchers = filteredVouchers.slice(startIndex, startIndex + pageSize);

  useEffect(() => setCurrentPage(1), [searchTerm, statusFilter, classFilter]);

  return (
    <div className="space-y-6">
      {/* Search + Filters Row */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search by Voucher # or Student Name..."
            className="pl-12 h-14 bg-white border-none rounded-2xl shadow-sm text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
        </div>

        <div className="flex flex-row gap-3 lg:w-auto">
        <Button
            variant="outline"
            onClick={() => setIsHistoryOpen(true)}
            className="h-8 px-6 bg-white border-none rounded-2xl shadow-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            <History className="mr-2 h-5 w-5 text-emerald-600" />
            View Details
          </Button>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-14 flex-1 lg:w-40 bg-white border-none rounded-2xl shadow-sm font-bold text-slate-600">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent side="bottom" position="popper" sideOffset={4}>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="ALL">All Status</SelectItem>
            </SelectContent>
          </Select>

          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="h-14 flex-1 lg:w-44 bg-white border-none rounded-2xl shadow-sm font-bold text-slate-600">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent side="bottom" position="popper" sideOffset={4}>
              <SelectItem value="all">All Classes</SelectItem>
              {classList.map((cls) => (
                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Container - Matches Students.jsx */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Payment Registry</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-lg border-collapse">
            <thead className="bg-slate-100 border-b-2 border-slate-200">
              <tr className="text-left font-semibold">
                <th className="px-6 py-4 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Student</th>
                <th className="px-6 py-4 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Voucher ID</th>
                <th className="px-6 py-4 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Amount</th>
                <th className="px-6 py-4 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Method</th>
                <th className="px-6 py-4 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Status</th>
                <th className="px-6 py-4 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center bg-white">
                    <p className="text-sm font-bold text-slate-500">
                      {statusFilter === "UNPAID"
                        ? "No unpaid vouchers match your filters"
                        : statusFilter === "PAID"
                        ? "No paid vouchers match your filters"
                        : "No vouchers match your filters"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing the search or changing filters.</p>
                  </td>
                </tr>
              ) : paginatedVouchers.map((v, i) => {
                // Match DataTable's zebra stripe so the voucher list looks
                // consistent with the rest of the app.
                const rowBg = i % 2 === 0 ? "bg-white" : "bg-slate-50";
                return (
                <tr key={v.id} className={`${rowBg} border-b border-slate-200 hover:bg-slate-100 transition-colors`}>
                  <td className="px-6 py-4 border-r border-slate-200 last:border-r-0">
                    <div className="font-bold text-slate-700">
                      {(() => {
                        const student = students.find(s => s.id === v.studentId);
                        return student ? `${student.firstName} ${student.lastName}` : (v.studentName || `ID: ${v.studentId}`);
                      })()}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-tighter">{v.month}</div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-blue-600 border-r border-slate-200 last:border-r-0">{v.voucherNumber}</td>
                  <td className="px-6 py-4 font-bold border-r border-slate-200 last:border-r-0">
                    {(() => {
                      const additionalFine = Math.max(0, getLateDetails(v.dueDate, v.studentId).lateFine - (v.fine || 0));
                      const remaining = v.status !== 'PAID'
                        ? Math.max(0, v.totalPayable + additionalFine - (v.paidAmount || 0))
                        : 0;
                      const paid = Number(v.paidAmount || 0);
                      return (
                        <div className="flex flex-col leading-tight">
                          <span className="text-slate-800">₨. {remaining.toLocaleString("en-PK")}</span>
                          <span className="text-[10px] font-normal text-slate-400 uppercase tracking-tight">
                            {v.status === 'PARTIAL' ? 'Remaining Dues' : v.status === 'PAID' ? 'Fully Paid' : 'Outstanding'}
                          </span>
                          <span className="text-[10px] mt-0.5 font-bold text-emerald-600">
                            Paid: ₨. {paid.toLocaleString("en-PK")}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 border-r border-slate-200 last:border-r-0">
                    <span className="capitalize text-slate-500 font-medium italic">
                      {v.paymentMethod || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 border-r border-slate-200 last:border-r-0">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${v.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right border-r border-slate-200 last:border-r-0">
                    {v.status === 'PAID' ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handlePrintThermalVoucher(v)}
                          className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          title="Print thermal voucher"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                          <CheckCircle2 size={14} /> Received
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handlePrintThermalVoucher(v)}
                          className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          title="Print thermal voucher"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {isEditable(v) && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingVoucher(v)}
                              className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              title="Edit voucher"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeletingVoucher(v)}
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete voucher"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleOpenCollect(v)}
                        >
                          Collect Fee
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination - Aligned with Students.jsx */}
        <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-slate-50/50 gap-4 border-t">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-tight">
            Showing <span className="text-slate-900">{filteredVouchers.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, filteredVouchers.length)}</span> of <span className="text-slate-900">{filteredVouchers.length}</span> Results
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400">Rows:</span>
              <Select value={pageSize.toString()} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}>
                <SelectTrigger className="w-16 h-8 rounded-lg bg-white shadow-sm font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map(s => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-10 w-10 bg-white shadow-sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center justify-center px-4 h-10 bg-emerald-600 rounded-xl text-white text-xs font-black">
                {currentPage} / {totalPages || 1}
              </div>
              <Button variant="ghost" size="icon" className="h-10 w-10 bg-white shadow-sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* COLLECTION MODAL */}
      <Dialog open={isCollectModalOpen} onOpenChange={setIsCollectModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-125 p-0 overflow-hidden shadow-xl border border-slate-200 rounded-xl bg-white">
          <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
             <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                <CheckCircle2 size={20} />
             </div>
             <div>
               <DialogTitle className="text-lg font-bold text-slate-900">Record Payment</DialogTitle>
               <DialogDescription className="text-[11px] font-medium mt-0.5">
                 Confirm receipt for voucher {selectedVoucher?.voucherNumber}
               </DialogDescription>
             </div>
          </div>

          {selectedVoucher && (
            <div className="p-6 space-y-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Student Name</Label>
                <Input
                  value={(() => {
                    const student = students.find(s => s.id === selectedVoucher.studentId);
                    return student ? `${student.firstName} ${student.lastName}` : selectedVoucher.studentId;
                  })()}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700"
                  disabled
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Amount Due</Label>
                  <Input value={`₨ ${selectedVoucher.calculatedTotal - (selectedVoucher.paidAmount || 0)}`} className="h-11 bg-slate-100/50 border-slate-200 font-black text-blue-600 rounded-xl" disabled />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Paying Now</Label>
                  <Input
                    type="number"
                    value={paymentDetails.amountToPay}
                    onChange={(e) => {
                      const val = e.target.value;
                      const remaining = selectedVoucher.calculatedTotal - (selectedVoucher.paidAmount || 0);
                      if (Number(val) > remaining) {
                        setPaymentDetails({ ...paymentDetails, amountToPay: remaining });
                      } else {
                        setPaymentDetails({ ...paymentDetails, amountToPay: val });
                      }
                    }}
                    max={selectedVoucher.calculatedTotal - (selectedVoucher.paidAmount || 0)}
                    className="h-11 border-emerald-200 bg-emerald-50/30 focus:bg-white rounded-xl font-black text-emerald-700"
                  />
                </div>
                <div className="col-span-full">
                  {selectedVoucher.lateDays > 0 && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                       <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight">
                         Includes late fine: ₨ {selectedVoucher.additionalFine} ({selectedVoucher.lateDays} days late)
                       </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Payment Method *</Label>
                <Select
                  value={paymentDetails.method}
                  onValueChange={(val) => setPaymentDetails({ ...paymentDetails, method: val })}
                >
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold">
                    <SelectValue placeholder={activeMethods.length === 0 ? "Add a payment method first" : "Select method"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {activeMethods.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-500 font-medium">
                        No payment methods configured. Add one in Payment Methods.
                      </div>
                    ) : (
                      activeMethods.map((m) => (
                        <SelectItem key={m.id} value={m.name}>
                          {m.name} — ₨ {Math.round(m.currentBalance).toLocaleString("en-PK")}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {paymentDetails.method && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    Collected amount will be added to <b>{paymentDetails.method}</b>.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Reference / Transaction ID (Optional)</Label>
                <Input
                  placeholder="e.g. TRX-12345"
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl"
                  value={paymentDetails.transactionId}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, transactionId: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter className="px-6 py-5 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={() => setIsCollectModalOpen(false)} className="h-11 px-6 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
              Cancel
            </Button>
            <Button className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]" onClick={confirmPayment}>
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditVoucherModal
        open={!!editingVoucher}
        setOpen={(v) => { if (!v) setEditingVoucher(null); }}
        voucher={editingVoucher}
        studentName={(() => {
          if (!editingVoucher) return "";
          const s = students.find((s) => s.id === editingVoucher.studentId);
          return s ? `${s.firstName} ${s.lastName}` : "Unknown student";
        })()}
        onSave={handleSaveEdit}
      />

      <AlertDialog
        open={!!deletingVoucher}
        onOpenChange={(v) => { if (!v) setDeletingVoucher(null); }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete voucher {deletingVoucher?.voucherNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the voucher. Only allowed because no payment has been collected against it yet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteVoucher}
              className="bg-red-600 hover:bg-red-700 rounded-xl font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StudentHistoryModal open={isHistoryOpen} setOpen={setIsHistoryOpen} />
    </div>
  );
}
