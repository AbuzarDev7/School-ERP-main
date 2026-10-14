import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus, Wallet, TrendingDown, Users, CheckCircle,
  ChevronDown, ChevronUp, Pencil, Trash2, Undo2,
  Loader2, Calendar, RotateCcw, Search,
  ChevronLeft, ChevronRight, MoreHorizontal, Clock, History
} from "lucide-react";
import { Button } from "@/components/ui/button"; // Assuming Search is imported from lucide-react
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNumericInput } from "@/hooks/useNumericInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DataTable from "@/components/shared/DataTable";
import AddWorkerModal from "./AddWorkerModal";
import AddAdvanceModal from "./AddAdvanceModal";
import ExtraHoursModal from "./ExtraHoursModal";
import WorkerHistoryModal from "./WorkerHistoryModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWorkers } from "@/context/WorkerContext";
import { usePaymentMethods } from "@/context/PaymentMethodContext";
import { useSettings } from "@/context/SettingsContext";
import { generateSalarySlipPDF } from "../reports/SalarySlipPrinter";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function SalaryManagement() {
  const {
    workers,
    loading,
    error,
    fetchWorkers,
    addWorker,
    updateWorker,
    deleteWorker,
    reactivateWorker,
    addPayment,
    undoPayment,
    addAdvance,
    updateAdvance,
    deleteAdvance,
    addExtraHours,
    updateExtraHours,
    deleteExtraHours,
    getPayrollContext,
    selectedMonth,
    setSelectedMonth
  } = useWorkers();
  const { refresh: refreshPaymentMethods } = usePaymentMethods();
  const { settings, brand } = useSettings();
  const ABSENCE_DAYS_DIVISOR = Math.max(1, Number(settings?.absenceWorkingDaysDivisor || 30));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [payingWorker, setPayingWorker] = useState(null);
  const [workerToDelete, setWorkerToDelete] = useState(null);
  const [paymentToUndo, setPaymentToUndo] = useState(null);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advancingWorker, setAdvancingWorker] = useState(null);
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [overtimeWorker, setOvertimeWorker] = useState(null);
  const [historyWorker, setHistoryWorker] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "Active" | "Inactive"
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleOpenAdd = () => {
    setEditingWorker(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (worker) => {
    setEditingWorker(worker);
    setIsModalOpen(true);
  };

  const handleSaveWorker = async (formData, photoFile) => {
    try {
      if (editingWorker) {
        await updateWorker(editingWorker.id, formData, photoFile);
      } else {
        await addWorker(formData, photoFile);
      }
      setIsModalOpen(false);
    } catch (err) {
      // Error handled in context/service
    }
  };

  const handleDeleteWorker = (worker) => {
    setWorkerToDelete(worker);
  };

  const confirmDelete = async () => {
    if (!workerToDelete) return;
    try {
      await deleteWorker(workerToDelete.id);
      setWorkerToDelete(null);
    } catch (err) {}
  };

  const handleOpenPay = (worker) => {
    setPayingWorker(worker);
  };

  const handleConfirmPayment = async (payload) => {
    if (!payingWorker) return;
    try {
      await addPayment({
        workerId: payingWorker.id,
        ...payload,
      });
      refreshPaymentMethods();

      // Auto-print the salary slip for the staff member who was just paid.
      const [yy, mm] = String(payload.month || selectedMonth).split("-");
      const periodLabel = `${MONTHS[Math.max(0, Number(mm) - 1)]} ${yy}`;
      generateSalarySlipPDF({
        staff: {
          name: payingWorker.name,
          role: payingWorker.role,
          phone: payingWorker.phone,
          salary: payload.totalSalary,
          overtimeAmount: payload.overtimeAmount,
          overtimeHours: payload.overtimeHours,
          advanceTotal: payload.advanceTotal,
          absenceDeduction: payload.absenceDeduction,
          netPaid: payload.netPaid,
          method: payload.method,
          isPaid: true,
          statusLabel: "Paid",
        },
        period: periodLabel,
        brand,
      });

      setPayingWorker(null);
    } catch (err) {
      // Error handled in context
    }
  };

  const handleUndoPayment = (paymentId) => {
    setPaymentToUndo(paymentId);
  };

  const confirmUndo = async () => {
    if (!paymentToUndo) return;
    try {
      await undoPayment(paymentToUndo);
      refreshPaymentMethods();
      setPaymentToUndo(null);
    } catch (err) {}
  };

  const handleOpenAdvance = (worker) => {
    setAdvancingWorker(worker);
    setIsAdvanceModalOpen(true);
  };

  const handleSaveAdvance = async (advanceData, advanceId = null) => {
    try {
      if (advanceId) {
        await updateAdvance(advanceId, advanceData);
      } else {
        await addAdvance({
          ...advanceData,
          workerId: advancingWorker.id,
          month: selectedMonth,
        });
      }
      refreshPaymentMethods();
    } catch (err) {}
  };

  const handleDeleteAdvance = async (advanceId) => {
    if (!confirm("Are you sure you want to delete this advance entry?")) return;
    try {
      await deleteAdvance(advanceId);
      refreshPaymentMethods();
    } catch (err) {}
  };

  const handleOpenExtra = (worker) => {
    setOvertimeWorker(worker);
    setIsExtraModalOpen(true);
  };

  const handleSaveExtra = async (data, id = null) => {
    try {
      if (id) {
        await updateExtraHours(id, data);
      } else {
        await addExtraHours({
          ...data,
          workerId: overtimeWorker.id,
          month: selectedMonth,
        });
      }
    } catch (err) {}
  };

  const handleDeleteExtra = async (id) => {
    if (!confirm("Remove this overtime entry?")) return;
    try {
      await deleteExtraHours(id);
    } catch (err) {}
  };


  // Stats Calculation
  const stats = useMemo(() => {
    const totalSalaryBill = workers.reduce((acc, w) => acc + w.monthlySalary, 0);
    const totalAdvances = workers.reduce((acc, w) =>
      acc + (w.advances?.reduce((sum, a) => sum + a.amount, 0) || 0), 0);
    const totalPaid = workers.reduce((acc, w) => acc + (w.payments?.[0]?.netPaid || 0), 0); // Assuming one payment per month
    const activeCount = workers.filter(w => w.status === "Active").length;

    return { totalSalaryBill, totalAdvances, totalPaid, activeCount };
  }, [workers]);

  const currentYear = new Date().getFullYear();
  const futureYearsLimit = 3;
  const years = useMemo(() => {
    const yearsArray = [];
    for (let y = currentYear; y <= currentYear + futureYearsLimit; y++) {
      yearsArray.push(y);
    }
    return yearsArray;
  }, [currentYear]);

  const [yearPart, monthPart] = selectedMonth.split("-").map(Number);
  const filterMonth = monthPart - 1;
  const filterYear = yearPart;

  const isFiltered = useMemo(() => {
    const now = new Date();
    return filterMonth !== now.getMonth() || filterYear !== now.getFullYear();
  }, [filterMonth, filterYear]);

  const resetFilters = () => {
    const now = new Date();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    setSelectedMonth(`${now.getFullYear()}-${m}`);
  };

  const handleMonthChange = (m) => {
    const monthStr = (m + 1).toString().padStart(2, '0');
    setSelectedMonth(`${filterYear}-${monthStr}`);
  };

  const handleYearChange = (y) => {
    const monthStr = (filterMonth + 1).toString().padStart(2, '0');
    setSelectedMonth(`${y}-${monthStr}`);
  };

  const formatCurrency = useCallback((n) => `Rs. ${Math.round(n || 0).toLocaleString()}`, []);

  const filteredWorkers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return workers.filter((worker) => {
      if (!worker.name.toLowerCase().includes(term)) return false;
      if (statusFilter === "all") return true;
      return worker.status === statusFilter;
    });
  }, [workers, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredWorkers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedWorkers = filteredWorkers.slice(startIndex, startIndex + pageSize);

  useEffect(() => setCurrentPage(1), [searchTerm, statusFilter]);

  // Settlement Logic
  const computeSettlement = useCallback((worker, absentDaysInput) => {
    const salary = worker?.monthlySalary || 0;
    const advanceTotal = worker?.advances?.reduce((s, a) => s + (Number(a.amount) || 0), 0) || 0;
    const overtimeAmount = worker?.extraHours?.reduce((s, e) => s + (Number(e.amount) || 0), 0) || 0;
    const overtimeHours = worker?.extraHours?.reduce((s, e) => s + (Number(e.hours) || 0), 0) || 0;
    
    const perDayRate = salary / ABSENCE_DAYS_DIVISOR;
    // Clamp at 0 — a negative would flip the deduction sign and *increase*
    // net pay. The numeric input strips minus signs, but defending here makes
    // the function safe to call from anywhere with any input.
    const absentDays = Math.max(0, parseFloat(absentDaysInput) || 0);
    const absenceDeduction = absentDays * perDayRate;

    const adjustedGross = salary + overtimeAmount - absenceDeduction;
    const netPaid = Math.max(0, adjustedGross - advanceTotal);

    return {
      totalSalary: salary,
      advanceTotal,
      overtimeAmount,
      overtimeHours,
      absentDays,
      absenceDeduction,
      netPaid,
      adjustedGross
    };
  }, [ABSENCE_DAYS_DIVISOR]);

  const columns = useMemo(() => [
    {
      header: "Worker",
      accessor: "name",
      render: (w) => {
        const imgUrl = w.profilePicture
          ? (w.profilePicture.startsWith('http') ? w.profilePicture : `${import.meta.env.VITE_API_URL || ""}${w.profilePicture}`)
          : null;
        return (
          <button
            type="button"
            onClick={() => setHistoryWorker(w)}
            title="View full history"
            className="flex items-center gap-3 -m-2 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left group"
          >
            <div className={cn(
              "w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center font-bold text-sm shrink-0",
              w.status === "Active" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
            )}>
              {imgUrl
                ? <img src={imgUrl} alt={w.name} className="w-full h-full object-cover" />
                : w.name.charAt(0)
              }
            </div>
            <div>
              <p className="font-bold text-slate-800 leading-tight group-hover:text-blue-600 group-hover:underline transition-colors">
                {w.name}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">{w.role || "No Role"}</p>
            </div>
          </button>
        );
      }
    },
    { header: "Salary", accessor: "monthlySalary", render: (w) => <span className="font-bold text-slate-700">{formatCurrency(w.monthlySalary)}</span> },
    {
      header: "Extra Hours",
      render: (w) => {
        const settlement = computeSettlement(w, 0);
        const hours = settlement.overtimeHours;
        const amount = settlement.overtimeAmount;
        const rate = hours > 0 ? amount / hours : 0;
        return (
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-blue-600">{hours} hrs</span>
            {hours > 0 && (
              <span className="text-[10px] text-slate-400 font-medium">
                {hours} × {formatCurrency(rate)} = {formatCurrency(amount)}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Advances",
      render: (w) => {
        const settlement = computeSettlement(w, 0);
        return <span className="font-bold text-amber-600">{formatCurrency(settlement.advanceTotal)}</span>;
      }
    },
    {
      header: "Absence Deduction",
      render: (w) => {
        const payment = w.payments?.[0];
        const recorded = payment ? Number(payment.absenceDeduction || 0) : 0;
        const days = payment ? Number(payment.absentDays || 0) : 0;
        const perDayRate = (Number(w.monthlySalary) || 0) / ABSENCE_DAYS_DIVISOR;
        return (
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-red-500">{formatCurrency(recorded)}</span>
            {days > 0 && (
              <span className="text-[10px] text-slate-400 font-medium">
                {days} × {formatCurrency(perDayRate)} / day
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Net Payable",
      render: (w) => {
        const payment = w.payments?.[0];
        // After payment, show what was actually paid; before payment, show the live preview.
        const value = payment ? Number(payment.netPaid || 0) : computeSettlement(w, 0).netPaid;
        return <span className="font-black text-emerald-600">{formatCurrency(value)}</span>;
      }
    },
    {
      header: "Status",
      className: "min-w-[90px]",
      render: (w) => {
        if (w.status === "Inactive") {
          return <span className="bg-slate-100 text-slate-500 text-[9px] px-2 py-0.5 rounded-full uppercase font-black">Inactive</span>;
        }
        const isPaid = !!w.payments?.[0];
        return isPaid ? 
          <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full uppercase font-black">Paid</span> :
          <span className="bg-amber-50 text-amber-600 text-[9px] px-2 py-0.5 rounded-full uppercase font-black">Unpaid</span>;
      }
    },
    {
      header: "Actions",
      sticky: true,
      render: (w) => {
        const isPaid = !!w.payments?.[0];
        const workerIsActive = w.status === "Active";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider border-slate-200 hover:bg-slate-50 transition-all gap-1.5 shadow-sm">
                <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" /> View Details
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" sideOffset={5} avoidCollisions={false} className="w-56 p-2 rounded-2xl shadow-xl border-slate-100">
              {workerIsActive && (
                <>
                  <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Payroll Actions</DropdownMenuLabel>
                  {!isPaid ? (
                    <>
                      <DropdownMenuItem onClick={() => handleOpenPay(w)} className="flex items-center h-10 px-3 rounded-xl font-bold text-blue-600 cursor-pointer hover:bg-blue-50 transition-colors">
                        <Wallet className="mr-2 h-4 w-4" /> Pay Salaries
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAdvance(w)} className="flex items-center h-10 px-3 rounded-xl font-bold text-amber-600 cursor-pointer hover:bg-amber-50 transition-colors">
                        <TrendingDown className="mr-2 h-4 w-4" /> Record Advance
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenExtra(w)} className="flex items-center h-10 px-3 rounded-xl font-bold text-indigo-600 cursor-pointer hover:bg-indigo-50 transition-colors">
                        <Clock className="mr-2 h-4 w-4" /> Manage Overtime
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => {
                        // Sort by date so we always revert the *latest* payment.
                        // Don't trust array order from the backend.
                        const latest = [...(w.payments || [])].sort(
                          (a, b) => new Date(b.date) - new Date(a.date)
                        )[0];
                        if (latest) handleUndoPayment(latest.id);
                      }}
                      className="flex items-center h-10 px-3 rounded-xl font-bold text-red-500 cursor-pointer hover:bg-red-50 transition-colors"
                    >
                      <Undo2 className="mr-2 h-4 w-4" /> Revert Payment
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Management</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleOpenEdit(w)} className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                <Pencil className="mr-2 h-4 w-4 text-slate-400" /> Edit Profile
              </DropdownMenuItem>
              {workerIsActive ? (
                <DropdownMenuItem onClick={() => handleDeleteWorker(w)} className="flex items-center h-10 px-3 rounded-xl font-bold text-red-600 cursor-pointer hover:bg-red-50 transition-colors">
                  <Trash2 className="mr-2 h-4 w-4 text-red-500" /> Deactivate Worker
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => reactivateWorker(w.id)} className="flex items-center h-10 px-3 rounded-xl font-bold text-emerald-600 cursor-pointer hover:bg-emerald-50 transition-colors">
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" /> Reactivate Worker
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ], [formatCurrency, computeSettlement]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Staff Payroll</h2>
          <p className="text-slate-500 text-sm font-medium">Manage salaries, advances, and overtime</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Calendar size={16} className="text-slate-400 shrink-0" />
            <select 
              value={filterMonth} 
              onChange={(e) => handleMonthChange(parseInt(e.target.value))}
              className="flex-1 sm:flex-none bg-white border border-slate-200 rounded-lg text-xs font-bold h-10 px-3 outline-none hover:border-slate-300 transition-colors min-w-[100px]"
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select 
              value={filterYear} 
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="flex-none bg-white border border-slate-200 rounded-lg text-xs font-bold h-10 px-3 outline-none hover:border-slate-300 transition-colors"
            >
              {years.map(y => (
                <option key={y} value={y} disabled={y > currentYear && filterYear === currentYear}>
                  {y}
                </option>
              ))}
            </select>
            {isFiltered && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resetFilters}
                className="h-10 w-10 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg animate-in fade-in zoom-in duration-300"
                title="Reset to current month"
              >
                <RotateCcw size={16} />
              </Button>
            )}
          </div>
          <Button onClick={handleOpenAdd} className="h-11 p-0 rounded-xl font-bold border-2 border-emerald-600 bg-transparent hover:bg-transparent shadow-lg shadow-emerald-900/20 transition-all overflow-hidden group w-full md:w-auto">
            <div className="flex items-center justify-center w-full h-full bg-emerald-600 px-6 animate-fast-blink text-white transition-colors group-hover:animate-none group-hover:bg-emerald-700">
              <Plus className="mr-2 h-5 w-5" /> Add Staff
            </div>
          </Button>
        </div>
      </div>

      {/* Search Bar + Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search workers by name..."
            className="pl-12 h-14 bg-white border-none rounded-2xl shadow-sm text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-14 w-full sm:w-44 bg-white border-none rounded-2xl shadow-sm font-bold text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Staff</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && workers.length === 0 && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between">
          <p className="text-sm text-red-600 font-bold">{error.message || "Failed to load worker data"}</p>
          <Button onClick={() => fetchWorkers(selectedMonth)} variant="ghost" size="sm" className="text-red-600 hover:bg-red-100 font-black uppercase text-[10px]">Retry Now</Button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Users size={20}/>} 
          color="text-blue-600" 
          bg="bg-blue-50" 
          label="Active Staff" 
          value={stats.activeCount} 
        />
        <StatCard 
          icon={<Wallet size={20}/>} 
          color="text-emerald-600" 
          bg="bg-emerald-50" 
          label="Total Salary Bill" 
          value={formatCurrency(stats.totalSalaryBill)} 
        />
        <StatCard 
          icon={<TrendingDown size={20}/>} 
          color="text-amber-600" 
          bg="bg-amber-50" 
          label="Total Advances" 
          value={formatCurrency(stats.totalAdvances)} 
        />
        <StatCard 
          icon={<CheckCircle size={20}/>} 
          color="text-slate-600" 
          bg="bg-slate-100" 
          label="Net Salaries Paid" 
          value={formatCurrency(stats.totalPaid)} 
        />
      </div>

      {/* Worker List */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={48} className="opacity-20 mb-4 animate-spin" />
            <p className="font-bold">Loading workers...</p>
          </div>
        ) : workers.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Users size={48} className="opacity-20 mb-4" />
            <p className="font-bold">No workers found for this period</p>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Users size={48} className="opacity-20 mb-4" />
            <p className="font-bold">
              {statusFilter !== "all"
                ? `No ${statusFilter.toLowerCase()} staff match your search`
                : "No staff match your search"}
            </p>
          </div>
        ) : (
          <>
            <DataTable columns={columns} data={paginatedWorkers} />

            {/* Pagination UI - Aligned with Invoices Pattern */}
            <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-slate-50/50 gap-4 border-t">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-tight">
                Showing <span className="text-slate-900">{filteredWorkers.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, filteredWorkers.length)}</span> of <span className="text-slate-900">{filteredWorkers.length}</span> Results
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
          </>
        )}
      </div>

      <AddWorkerModal
        open={isModalOpen}
        setOpen={setIsModalOpen}
        onSave={handleSaveWorker}
        initialData={editingWorker}
        loading={loading}
      />

      <AlertDialog open={!!workerToDelete} onOpenChange={(open) => !open && setWorkerToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-slate-900">Deactivate Worker?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Are you sure you want to deactivate <b>{workerToDelete?.name}</b>? 
              This will change their status to Inactive. They will no longer appear in active payroll lists, but their history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold">
              Confirm Deactivation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!paymentToUndo} onOpenChange={(open) => !open && setPaymentToUndo(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-slate-900">Undo Payment?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Are you sure you want to revert this payment? This will restore any overtime links and remove the associated cashbook entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUndo} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold">
              Confirm Undo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PaySalariesDialog
        key={payingWorker?.id || "none"}
        open={!!payingWorker}
        setOpen={(val) => !val && setPayingWorker(null)}
        worker={payingWorker}
        onConfirm={handleConfirmPayment}
        formatCurrency={formatCurrency}
        selectedMonth={selectedMonth}
        getPayrollContext={getPayrollContext}
      />

      <AddAdvanceModal
        open={isAdvanceModalOpen}
        setOpen={setIsAdvanceModalOpen}
        worker={advancingWorker}
        onSave={handleSaveAdvance}
        onDelete={handleDeleteAdvance}
        selectedMonth={selectedMonth}
        formatCurrency={formatCurrency}
      />

      <ExtraHoursModal
        open={isExtraModalOpen}
        setOpen={setIsExtraModalOpen}
        worker={overtimeWorker}
        onSave={handleSaveExtra}
        onDelete={handleDeleteExtra}
        selectedMonth={selectedMonth}
        formatCurrency={formatCurrency}
      />

      <WorkerHistoryModal
        open={!!historyWorker}
        setOpen={(v) => !v && setHistoryWorker(null)}
        worker={historyWorker}
      />
    </div>
  );
}

function buildLast12Months() {
  const opts = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < 12; i++) {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    opts.push(`${y}-${m}`);
    d.setMonth(d.getMonth() - 1);
  }
  return opts;
}

function PaySalariesDialog({ open, setOpen, worker, onConfirm, formatCurrency, selectedMonth, getPayrollContext }) {
  const { sanitize } = useNumericInput();
  const { activeMethods } = usePaymentMethods();
  const { settings } = useSettings();
  const ABSENCE_DIVISOR = Math.max(1, Number(settings?.absenceWorkingDaysDivisor || 30));
  const todayISO = new Date().toISOString().split("T")[0];

  const [payForMonth, setPayForMonth] = useState(selectedMonth);
  const [payDate, setPayDate] = useState(todayISO);
  const [absentDays, setAbsentDays] = useState(0);
  const [methodInput, setMethodInput] = useState("");
  const [notes, setNotes] = useState("");

  // Reactively pick the first active method until the user explicitly chooses one.
  // This avoids stale "Cash" defaults captured before PaymentMethodContext finished loading.
  const method = methodInput && activeMethods.some((m) => m.name === methodInput)
    ? methodInput
    : (activeMethods[0]?.name || "");

  const [advances, setAdvances] = useState([]);
  const [pendingExtraHours, setPendingExtraHours] = useState([]);
  const [existingPayment, setExistingPayment] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const monthOptions = useMemo(() => buildLast12Months(), []);

  useEffect(() => {
    if (!open || !worker) return;
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return;
        setContextLoading(true);
        return getPayrollContext(worker.id, payForMonth);
      })
      .then((ctx) => {
        if (cancelled || !ctx) return;
        setAdvances(ctx.advances || []);
        setPendingExtraHours(ctx.pendingExtraHours || []);
        setExistingPayment(ctx.payment || null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setContextLoading(false); });

    return () => { cancelled = true; };
  }, [open, worker?.id, payForMonth, getPayrollContext]);

  const settlement = useMemo(() => {
    const salary = Number(worker?.monthlySalary || 0);
    const advanceTotal = advances.reduce((s, a) => s + Number(a.amount || 0), 0);
    const overtimeHours = pendingExtraHours.reduce((s, e) => s + Number(e.hours || 0), 0);
    const overtimeAmount = Math.round(pendingExtraHours.reduce((s, e) => s + Number(e.amount || 0), 0) * 100) / 100;
    const days = Math.max(0, parseFloat(String(absentDays).replace(/,/g, "")) || 0);
    const perDayRate = salary / ABSENCE_DIVISOR;
    const absenceDeduction = Math.round(days * perDayRate * 100) / 100;
    const adjustedGross = salary + overtimeAmount - absenceDeduction;
    const netPaid = Math.max(0, adjustedGross - advanceTotal);
    return {
      totalSalary: salary,
      advanceTotal,
      overtimeHours,
      overtimeAmount,
      absentDays: days,
      absenceDeduction,
      adjustedGross,
      netPaid,
    };
  }, [worker, advances, pendingExtraHours, absentDays, ABSENCE_DIVISOR]);

  const isPaidForMonth = !!existingPayment;
  const selectedMethod = activeMethods.find((m) => m.name === method);
  const availableBalance = Number(selectedMethod?.currentBalance ?? 0);
  const requiresFunds = settlement.netPaid > 0;
  const insufficient = requiresFunds && (!selectedMethod || settlement.netPaid > availableBalance);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isPaidForMonth || contextLoading || submitting) return;
    if (insufficient) return;
    setSubmitting(true);
    try {
      await onConfirm({
        month: payForMonth,
        paidDate: payDate,
        method,
        notes,
        totalSalary: settlement.totalSalary,
        advanceTotal: settlement.advanceTotal,
        overtimeHours: settlement.overtimeHours,
        overtimeAmount: settlement.overtimeAmount,
        absentDays: settlement.absentDays,
        absenceDeduction: settlement.absenceDeduction,
        netPaid: settlement.netPaid,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl bg-white">
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Wallet size={24} />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900">Finalize Payment</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Pay salaries to <b>{worker?.name}</b>
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Pay For Month</Label>
              <Select value={payForMonth} onValueChange={setPayForMonth}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Payment Date</Label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>
          </div>

          {contextLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
              <Loader2 size={14} className="animate-spin" /> Loading {payForMonth} payroll context...
            </div>
          )}

          {isPaidForMonth && !contextLoading && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs font-bold text-amber-700">
              Salaries have already been paid for {payForMonth}. Undo the existing payment to redo.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Absent Days</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={absentDays === 0 ? "" : absentDays}
                onChange={(e) => {
                  const num = sanitize(e.target.value);
                  if (num !== null) setAbsentDays(num);
                }}
                disabled={isPaidForMonth || contextLoading}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
                placeholder="0.0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Paid Via</Label>
              <Select
                value={method}
                onValueChange={setMethodInput}
                disabled={isPaidForMonth || settlement.netPaid <= 0}
              >
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder={activeMethods.length === 0 ? "Add a method first" : "Select method"} />
                </SelectTrigger>
                <SelectContent>
                  {activeMethods.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500 font-medium">
                      No payment methods configured.
                    </div>
                  ) : (
                    activeMethods.map(m => (
                      <SelectItem key={m.id} value={m.name}>
                        {m.name} — {formatCurrency(m.currentBalance)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {requiresFunds && selectedMethod && (
                <p className={cn(
                  "text-[11px] font-bold",
                  insufficient ? "text-red-600" : "text-slate-500"
                )}>
                  Available: {formatCurrency(availableBalance)}
                </p>
              )}
            </div>
          </div>

          {requiresFunds && insufficient && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-700">
              {selectedMethod
                ? <>Insufficient balance in <b>{selectedMethod.name}</b>. Need {formatCurrency(settlement.netPaid)}, available {formatCurrency(availableBalance)}.</>
                : <>Pick an active payment method to pay these salaries.</>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Notes (Optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPaidForMonth || contextLoading}
              className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              placeholder="Any remarks..."
            />
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
            <div className="flex justify-between text-xs font-medium text-slate-500">
              <span>Monthly Salary:</span>
              <span className="font-bold text-slate-700">{formatCurrency(settlement.totalSalary)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-slate-500">
              <span>Extra Hours ({settlement.overtimeHours}h, {pendingExtraHours.length} entries):</span>
              <span className="font-bold text-blue-600">+{formatCurrency(settlement.overtimeAmount)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-slate-500">
              <span>Absence ({settlement.absentDays} × Rs/day):</span>
              <span className="font-bold text-red-500">-{formatCurrency(settlement.absenceDeduction)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-slate-500 border-t pt-2.5">
              <span>Adjusted Gross:</span>
              <span className="font-bold text-slate-700">{formatCurrency(settlement.adjustedGross)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-slate-500">
              <span>Advances ({advances.length}):</span>
              <span className="font-bold text-amber-600">-{formatCurrency(settlement.advanceTotal)}</span>
            </div>
            <div className="flex justify-between items-center pt-2.5 border-t border-slate-200">
              <span className="text-sm font-black uppercase text-slate-900">Net to Pay:</span>
              <span className="text-xl font-black text-emerald-600">{formatCurrency(settlement.netPaid)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t bg-white">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)} className="h-12 px-6 font-bold text-slate-600 hover:bg-slate-200 rounded-xl">Cancel</Button>
            <Button
              type="submit"
              disabled={isPaidForMonth || contextLoading || submitting || insufficient}
              className="h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-8 rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98]"
            >
              {submitting
                ? "Processing..."
                : insufficient
                  ? "Insufficient funds"
                  : `Pay ${formatCurrency(settlement.netPaid)}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon, color, bg, label, value }) {
  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", bg, color)}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="text-xl font-black text-slate-800">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkerRow({ worker, formatCurrency, computeSettlement }) {
  const isPaid = useMemo(() => !!(worker.payments && worker.payments.length > 0), [worker.payments]);
  const [isExpanded, setIsExpanded] = useState(false);
  const { sanitize } = useNumericInput();
  const [absentDays, setAbsentDays] = useState(0);

  const settlement = useMemo(() => {
    return computeSettlement(worker, absentDays);
  }, [worker, absentDays, computeSettlement]);

  return (
    <div className="bg-white border border-slate-100 p-4 rounded-2xl group hover:shadow-md transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm",
              (worker.status === "Active" || worker.status === "ACTIVE") ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
          )}>
              {worker.name?.charAt(0) || "W"}
            </div>
          <div>
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              {worker.name || "Unknown Worker"}
              {isPaid && <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full uppercase font-black">Paid</span>}
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase">{worker.role || 'No Role'}</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Monthly Salary</p>
            <p className="font-bold text-slate-700">{formatCurrency(worker.monthlySalary)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Advances</p>
            <p className="font-bold text-amber-600">{formatCurrency(settlement.advanceTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Overtime</p>
            <p className="font-bold text-blue-600">{formatCurrency(settlement.overtimeAmount)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Net Payable</p>
            <p className="font-black text-emerald-600 text-lg">{formatCurrency(settlement.netPaid)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPaid ? (
            <Button size="sm" className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg h-9">Pay Salaries</Button>
          ) : (
            <Button size="sm" variant="ghost" className="text-red-500 font-bold h-9"><Undo2 size={16} className="mr-1"/> Undo</Button>
          )}
          <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400"><Pencil size={16}/></Button>
          <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </Button>
        </div>
      </div>
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Absent Days</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={absentDays === 0 ? "" : absentDays}
              onChange={(e) => {
                const num = sanitize(e.target.value);
                if (num !== null) setAbsentDays(num);
              }}
              className="h-10 bg-slate-50 rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Absence Deduction</Label>
            <Input
              type="text"
              readOnly
              value={formatCurrency(settlement.absenceDeduction)}
              className="h-10 bg-slate-100 rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Adjusted Gross</Label>
            <Input
              type="text"
              readOnly
              value={formatCurrency(settlement.adjustedGross)}
              className="h-10 bg-slate-100 rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}