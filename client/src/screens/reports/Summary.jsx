// Summary.jsx — executive snapshot of every report (no row-level duplication)
import { useStudents } from "@/context/StudentContext"
import { useVouchers } from "@/context/VoucherContext"
import { useInvoices } from "@/context/InvoiceContext"
import { useWorkers } from "@/context/WorkerContext"
import { useExpenses } from "@/context/ExpenseContext"
import { useFeeStructures } from "@/context/FeeStructureContext"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar, RotateCcw, Wallet, ShoppingBag, TrendingDown, Briefcase, Users, GraduationCap, ShieldAlert, BadgePercent, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import SummaryPrinter from "./SummaryPrinter"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const formatPKR = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;

export default function Summary() {
  const { students } = useStudents();
  const { vouchers, pendingDuesList } = useVouchers();
  const { invoices } = useInvoices();
  const { workers } = useWorkers();
  const { expenses } = useExpenses();
  const { structures } = useFeeStructures();

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  const currentYear = now.getFullYear();
  const startYear = 2026;
  const futureYearsLimit = 3;
  const years = useMemo(() => {
    const arr = [];
    for (let y = startYear; y <= currentYear + futureYearsLimit; y++) arr.push(y);
    return arr;
  }, [currentYear]);

  const isFiltered = filterMonth !== now.getMonth() || filterYear !== now.getFullYear();
  const resetFilters = () => {
    setFilterMonth(now.getMonth());
    setFilterYear(now.getFullYear());
  };

  const period = `${MONTHS[filterMonth]} ${filterYear}`;
  const targetMonthStr = `${MONTHS[filterMonth]} ${filterYear}`;

  const inMonth = (raw) => {
    if (!raw) return false;
    const d = new Date(raw);
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  };

  // ---------- Aggregates ----------
  const aggregates = useMemo(() => {
    // Fee collection in the period (driven by payment date, i.e. updatedAt)
    const feeCollection = vouchers
      .filter((v) => inMonth(v.updatedAt || v.createdAt))
      .reduce((s, v) => s + Number(v.paidAmount || 0), 0);

    // Targeted vs actual recovery for the selected month
    const targetedFee = vouchers.filter((v) => v.month === targetMonthStr).reduce((s, v) => s + Number(v.totalPayable || 0), 0);
    const actualFee = vouchers.filter((v) => v.month === targetMonthStr).reduce((s, v) => s + Number(v.paidAmount || 0), 0);
    const recoveryRate = targetedFee > 0 ? ((actualFee / targetedFee) * 100).toFixed(1) : "0.0";

    // Sales (invoices) in the period
    const salesInvoices = invoices.filter((inv) => inMonth(inv.invoiceDate || inv.createdAt));
    const sales = salesInvoices.reduce((s, inv) => s + Number(inv.grandTotal || 0), 0);
    const salesAvg = salesInvoices.length > 0 ? sales / salesInvoices.length : 0;

    // Expenses in the period
    const periodExpenses = expenses.filter((e) => inMonth(e.date));
    const totalExpenses = periodExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const byHead = {};
    periodExpenses.forEach((e) => {
      const h = e.head?.name || "Uncategorized";
      byHead[h] = (byHead[h] || 0) + Number(e.amount || 0);
    });
    const topExpenseEntry = Object.entries(byHead).sort((a, b) => b[1] - a[1])[0];

    // Salary — based on whatever month WorkerContext has loaded
    const activeWorkers = workers.filter((w) => w.status === "Active");
    const totalSalaryBill = activeWorkers.reduce((s, w) => s + Number(w.monthlySalary || 0), 0);
    const paidSalaries = workers.reduce((s, w) => s + Number(w.payments?.[0]?.netPaid || 0), 0);
    const paidStaff = workers.filter((w) => !!w.payments?.[0]).length;
    const pendingStaff = activeWorkers.length - paidStaff;

    // People
    const activeStudents = students.filter((s) => s.status === "ACTIVE").length;
    const totalClasses = structures.length;
    const activeStaff = activeWorkers.length;

    // Defaulters
    const defaultersCount = pendingDuesList.length;
    const totalOutstanding = pendingDuesList.reduce((s, p) => s + Number(p.balance || 0), 0);
    const topDefaulter = [...pendingDuesList].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))[0];

    // Net position
    const inflow = feeCollection + sales;
    const outflow = totalExpenses + paidSalaries;
    const netPosition = inflow - outflow;

    return {
      feeCollection, targetedFee, actualFee, recoveryRate,
      sales, salesCount: salesInvoices.length, salesAvg,
      totalExpenses, expenseCount: periodExpenses.length, topExpenseEntry,
      totalSalaryBill, paidSalaries, paidStaff, pendingStaff,
      activeStudents, totalClasses, activeStaff,
      defaultersCount, totalOutstanding, topDefaulter,
      netPosition,
    };
  }, [vouchers, invoices, expenses, workers, students, structures, pendingDuesList, filterMonth, filterYear, targetMonthStr]);

  // ---------- KPI sets ----------
  const financial = [
    {
      label: "Fee Collection",
      value: formatPKR(aggregates.feeCollection),
      accent: [37, 99, 235], icon: Wallet,
      subtitle: `${aggregates.recoveryRate}% recovery`,
      tooltip: `Total fee voucher payments received in ${period} (driven by payment date). Recovery rate compares what was collected against what was billed for this month's fee batch.`,
    },
    {
      label: "Sales",
      value: formatPKR(aggregates.sales),
      accent: [16, 185, 129], icon: ShoppingBag,
      subtitle: `${aggregates.salesCount} invoice${aggregates.salesCount === 1 ? "" : "s"}`,
      tooltip: `Sum of grand totals from all invoices issued in ${period} (uniforms, books, supplies, etc.). Counts the number of invoice records in the same window.`,
    },
    {
      label: "Expenses",
      value: formatPKR(aggregates.totalExpenses),
      accent: [220, 38, 38], icon: TrendingDown,
      subtitle: `${aggregates.expenseCount} entr${aggregates.expenseCount === 1 ? "y" : "ies"}`,
      tooltip: `Total spending recorded against any expense head in ${period}. Subtitle shows how many individual expense entries make up the total.`,
    },
    {
      label: "Net Position",
      value: formatPKR(aggregates.netPosition),
      accent: aggregates.netPosition >= 0 ? [0, 122, 85] : [220, 38, 38], icon: BadgePercent,
      subtitle: aggregates.netPosition >= 0 ? "Surplus" : "Deficit",
      tooltip: `(Fee Collection + Sales) − (Expenses + Net Salaries Paid). Positive = surplus, negative = deficit. Salaries pull from the month currently loaded in the Salary screen.`,
    },
  ];

  const people = [
    {
      label: "Students",
      value: String(aggregates.activeStudents),
      accent: [99, 102, 241], icon: Users,
      subtitle: "Active enrollment",
      tooltip: "Students currently marked as ACTIVE in the system. Inactive / discharged students are excluded.",
    },
    {
      label: "Classes",
      value: String(aggregates.totalClasses),
      accent: [217, 119, 6], icon: GraduationCap,
      subtitle: "On roll",
      tooltip: "Number of distinct class fee structures defined under Fees → Class-wise Fees. Reflects every class the school is collecting fees for.",
    },
    {
      label: "Staff",
      value: String(aggregates.activeStaff),
      accent: [14, 165, 233], icon: Briefcase,
      subtitle: `${aggregates.paidStaff}P / ${aggregates.pendingStaff}U salaries`,
      tooltip: `Active staff on the payroll. Subtitle shows how many have been paid (P) and how many are still pending (U) for the salary screen's current month.`,
    },
    {
      label: "Defaulters",
      value: String(aggregates.defaultersCount),
      accent: [220, 38, 38], icon: ShieldAlert,
      subtitle: formatPKR(aggregates.totalOutstanding),
      tooltip: "Students with outstanding fee balances across any month. Subtitle is the combined institution-wide outstanding amount.",
    },
  ];

  // ---------- Highlights table ----------
  const highlights = [
    { report: "Fee Collection", metric: "Recovery rate this month", value: `${aggregates.recoveryRate}%` },
    { report: "Income", metric: "Targeted vs Collected", value: `${formatPKR(aggregates.actualFee)} / ${formatPKR(aggregates.targetedFee)}` },
    { report: "Invoices", metric: "Average per invoice", value: aggregates.salesCount > 0 ? formatPKR(aggregates.salesAvg) : "—" },
    { report: "Expenses", metric: "Top spending head", value: aggregates.topExpenseEntry ? `${aggregates.topExpenseEntry[0]} — ${formatPKR(aggregates.topExpenseEntry[1])}` : "—" },
    { report: "Salary", metric: "Paid / Pending staff", value: `${aggregates.paidStaff} / ${aggregates.pendingStaff}` },
    { report: "Salary", metric: "Net salaries paid", value: formatPKR(aggregates.paidSalaries) },
    { report: "Defaulters", metric: "Top outstanding", value: aggregates.topDefaulter ? `${aggregates.topDefaulter.firstName} ${aggregates.topDefaulter.lastName} — ${formatPKR(aggregates.topDefaulter.balance)}` : "—" },
    { report: "Defaulters", metric: "Total outstanding", value: formatPKR(aggregates.totalOutstanding) },
  ];

  return (
    <div className="space-y-6">
      {/* Period control */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-800">Executive Summary</h3>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">Period: {period}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={16} className="text-slate-400 shrink-0" />
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(parseInt(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg text-xs font-bold h-10 px-3 outline-none hover:border-slate-300 transition-colors min-w-25"
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg text-xs font-bold h-10 px-3 outline-none hover:border-slate-300 transition-colors"
          >
            {years.map((y) => (
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
          <SummaryPrinter period={period} financial={financial} people={people} highlights={highlights} />
        </div>
      </div>

      {/* Financial Snapshot */}
      <SectionLabel>Financial Snapshot</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {financial.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* People Snapshot */}
      <SectionLabel>Operations Snapshot</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {people.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Highlights */}
      <SectionLabel>Report Highlights</SectionLabel>
      <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 py-3">Report</th>
                <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 py-3">Headline Metric</th>
                <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 py-3">Value</th>
              </tr>
            </thead>
            <tbody>
              {highlights.map((h, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-slate-800">{h.report}</td>
                  <td className="px-6 py-3.5 text-slate-500 font-medium">{h.metric}</td>
                  <td className="px-6 py-3.5 text-right font-mono font-black text-emerald-600">{h.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Net position banner */}
      <div className={cn(
        "rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl",
        aggregates.netPosition >= 0 ? "bg-emerald-700" : "bg-red-700"
      )}>
        <div className="flex items-center gap-5">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center",
            aggregates.netPosition >= 0 ? "bg-emerald-500/30" : "bg-red-500/30"
          )}>
            <BadgePercent className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-xl font-bold">Net Position — {period}</h4>
            <p className="text-white/70 text-sm">Inflow: {formatPKR(aggregates.feeCollection + aggregates.sales)} · Outflow: {formatPKR(aggregates.totalExpenses + aggregates.paidSalaries)}</p>
          </div>
        </div>
        <div className="text-center md:text-right">
          <p className="text-3xl font-black">{formatPKR(aggregates.netPosition)}</p>
          <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mt-1">
            {aggregates.netPosition >= 0 ? "Surplus" : "Deficit"}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-1 h-3 bg-emerald-600 rounded-full" />
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{children}</span>
    </div>
  );
}

function KpiCard({ label, value, subtitle, accent, icon: Icon, tooltip }) {
  const r = accent[0], g = accent[1], b = accent[2];

  return (
    <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="h-1 w-full" style={{ backgroundColor: `rgb(${r},${g},${b})` }} />
      <CardHeader className="pb-1 pt-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{label}</CardTitle>
        <div className="flex items-center gap-1.5">
          {tooltip && (
            // Click-triggered info popover replaces the previous hover-only
            // tooltip — touch users can now reach the explanation, and the
            // tooltip no longer pops open as the cursor wanders past a card.
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-6 h-6 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                  aria-label={`What is ${label}?`}
                >
                  <Info size={13} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={6}
                className="w-60 max-w-[calc(100vw-2rem)] p-4 rounded-xl shadow-xl border-slate-100"
              >
                <p className="text-xs leading-relaxed font-medium text-slate-600">{tooltip}</p>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {Icon && (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `rgba(${r},${g},${b},0.1)`, color: `rgb(${r},${g},${b})` }}>
              <Icon size={14} />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-black truncate" style={{ color: `rgb(${r},${g},${b})` }}>{value}</div>
        {subtitle && <div className="text-[11px] font-bold text-slate-400 mt-1 truncate">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}
