// Salary.jsx — payroll report scoped to a specific month
import DataTable from "@/components/shared/DataTable"
import { useWorkers } from "@/context/WorkerContext"
import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import SalaryHistoryPrinter from "./SalaryHistoryPrinter"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const formatCurrency = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;

export default function Salary({ statusFilter = "all", setStatusFilter }) {
  const { workers, selectedMonth, setSelectedMonth, loading } = useWorkers();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Defend against an empty/null/malformed selectedMonth — split() on "" gives
  // [""] and Number("") is NaN, which propagates into the UI as "NaN" and
  // breaks the month/year selectors. Fall back to the current YYYY-MM.
  const safeMonth = /^\d{4}-\d{2}$/.test(selectedMonth || "")
    ? selectedMonth
    : (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })();
  const [yearPart, monthPart] = safeMonth.split("-").map(Number);
  const filterMonthIdx = monthPart - 1;
  const filterYear = yearPart;
  const currentYear = new Date().getFullYear();
  const startYear = 2026; // Starting historical year (matches Dashboard)
  const futureYearsLimit = 3; // How many years into the future to show

  const years = useMemo(() => {
    const yearsArray = [];
    for (let y = startYear; y <= currentYear + futureYearsLimit; y++) {
      yearsArray.push(y);
    }
    return yearsArray;
  }, [currentYear, futureYearsLimit]);

  const handleMonthChange = (m) => {
    const monthStr = (m + 1).toString().padStart(2, "0");
    setSelectedMonth(`${filterYear}-${monthStr}`);
  };
  const handleYearChange = (y) => {
    const monthStr = (filterMonthIdx + 1).toString().padStart(2, "0");
    setSelectedMonth(`${y}-${monthStr}`);
  };

  const sessionLabel = `${filterYear}-${String(filterYear + 1).slice(-2)}`;

  const rows = useMemo(() => workers.map((w) => {
    const payment = w.payments?.[0];
    const advanceTotal = (w.advances || []).reduce((s, a) => s + Number(a.amount || 0), 0);
    const overtimeAmount = (w.extraHours || []).reduce((s, e) => s + Number(e.amount || 0), 0);
    const overtimeHours = (w.extraHours || []).reduce((s, e) => s + Number(e.hours || 0), 0);
    const isPaid = !!payment;
    const isActive = w.status === "Active";
    const statusLabel = !isActive ? "Inactive" : (isPaid ? "Paid" : "Pending");
    return {
      id: w.id,
      name: w.name,
      phone: w.phone || "—",
      role: w.role || "—",
      salary: Number(w.monthlySalary || 0),
      overtimeAmount,
      overtimeHours,
      advanceTotal,
      absenceDeduction: payment ? Number(payment.absenceDeduction || 0) : 0,
      netPaid: payment ? Number(payment.netPaid || 0) : 0,
      method: payment?.method || "—",
      status: w.status,
      statusLabel,
      isPaid,
      isActive,
    };
  }), [workers]);

  const data = useMemo(() => {
    let filtered = rows;
    if (statusFilter === "paid") filtered = filtered.filter((r) => r.isPaid);
    else if (statusFilter === "pending") filtered = filtered.filter((r) => r.isActive && !r.isPaid);
    else if (statusFilter === "inactive") filtered = filtered.filter((r) => !r.isActive);
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, statusFilter]);

  const stats = useMemo(() => {
    const totalSalary = rows.filter((r) => r.isActive).reduce((s, r) => s + r.salary, 0);
    const totalPaid = rows.reduce((s, r) => s + r.netPaid, 0);
    const totalAdvances = rows.reduce((s, r) => s + r.advanceTotal, 0);
    const paidCount = rows.filter((r) => r.isPaid).length;
    const pendingCount = rows.filter((r) => r.isActive && !r.isPaid).length;
    return { totalSalary, totalPaid, totalAdvances, paidCount, pendingCount };
  }, [rows]);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  useEffect(() => setCurrentPage(1), [selectedMonth, statusFilter]);

  const columns = [
    {
      header: "Staff",
      accessor: "name",
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-slate-800">{row.name}</span>
          <span className="text-[10px] uppercase font-bold text-slate-400">{row.role}</span>
        </div>
      ),
    },
    {
      header: "Salary",
      render: (row) => <span className="font-bold text-slate-700">{formatCurrency(row.salary)}</span>,
    },
    {
      header: "Overtime",
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-blue-600">{formatCurrency(row.overtimeAmount)}</span>
          {row.overtimeHours > 0 && (
            <span className="text-[10px] text-slate-400 font-medium">{row.overtimeHours} hrs</span>
          )}
        </div>
      ),
    },
    {
      header: "Advances",
      render: (row) => <span className="font-bold text-amber-600">{formatCurrency(row.advanceTotal)}</span>,
    },
    {
      header: "Absence Ded.",
      render: (row) => <span className="font-bold text-red-500">{formatCurrency(row.absenceDeduction)}</span>,
    },
    {
      header: "Net Paid",
      render: (row) => <span className="font-black text-emerald-600">{formatCurrency(row.netPaid)}</span>,
    },
    {
      header: "Method",
      render: (row) => row.method !== "—"
        ? <span className="capitalize font-bold text-slate-700">{row.method}</span>
        : <span className="text-slate-300 font-medium">—</span>,
    },
    {
      header: "Status",
      render: (row) => {
        if (!row.isActive) return <span className="bg-slate-100 text-slate-500 text-[9px] px-2 py-0.5 rounded-full uppercase font-black">Inactive</span>;
        return row.isPaid
          ? <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full uppercase font-black">Paid</span>
          : <span className="bg-amber-50 text-amber-600 text-[9px] px-2 py-0.5 rounded-full uppercase font-black">Unpaid</span>;
      },
    },
    {
      header: "History",
      render: (row) => <SalaryHistoryPrinter workerId={row.id} workerName={row.name} session={filterYear} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Salary Bill" value={formatCurrency(stats.totalSalary)} color="blue" isCurrency />
        <StatCard title="Net Salaries Paid" value={formatCurrency(stats.totalPaid)} subtitle={`${stats.paidCount} paid`} color="emerald" isCurrency />
        <StatCard title="Pending Salaries" value={stats.pendingCount} subtitle={`of active staff`} color="amber" />
        <StatCard title="Total Advances" value={formatCurrency(stats.totalAdvances)} color="red" isCurrency />
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Payroll Register</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {MONTHS[filterMonthIdx]} {filterYear}
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="font-bold text-emerald-600">Session {sessionLabel}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Period:</span>
            <select
              value={filterMonthIdx}
              onChange={(e) => handleMonthChange(parseInt(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg text-xs font-bold h-9 px-3 outline-none hover:border-slate-300 transition-colors"
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select
              value={filterYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg text-xs font-bold h-9 px-3 outline-none hover:border-slate-300 transition-colors"
            >
              {years.map((y) => (
                <option key={y} value={y} disabled={y > currentYear && filterYear === currentYear}>
                  {y}
                </option>
              ))}
            </select>

            <span className="text-[10px] font-black uppercase text-slate-400 ml-2">Filter:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9 rounded-lg bg-white shadow-sm font-bold text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid Only</SelectItem>
                <SelectItem value="pending">Pending Only</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm font-bold text-slate-400">Loading payroll data...</div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={paginatedData} />
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-slate-50/50 gap-4 border-t">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-tight">
            Showing <span className="text-slate-900">{data.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, data.length)}</span> of <span className="text-slate-900">{data.length}</span> Results
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
    </div>
  );
}

function StatCard({ title, value, subtitle, color, isCurrency }) {
  const colorMap = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    red: "bg-red-600",
  };
  const valueColor = isCurrency
    ? (color === "red" ? "text-red-600" : color === "emerald" ? "text-emerald-600" : "text-blue-600")
    : "text-slate-800";

  return (
    <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
      <div className={`h-1 ${colorMap[color] || 'bg-slate-200'} w-full`} />
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`text-3xl font-black truncate ${valueColor}`}>{value}</div>
        {subtitle && <div className="text-[11px] font-bold text-slate-400 mt-1 truncate">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}
