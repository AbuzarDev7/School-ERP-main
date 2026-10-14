// Reports.jsx
import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useVouchers } from "@/context/VoucherContext"
import { useStudents } from "@/context/StudentContext"
import { useFeeStructures } from "@/context/FeeStructureContext"
import { usePaymentMethods } from "@/context/PaymentMethodContext"
import { useInvoices } from "@/context/InvoiceContext"
import { useProducts } from "@/context/ProductContext"
import { useExpenses } from "@/context/ExpenseContext"
import { useWorkers } from "@/context/WorkerContext"
import { Users, LayoutDashboard, TrendingUp, History, ChevronDown, Wallet, Briefcase, Receipt, GraduationCap, UserSquare, LayoutGrid } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import Defaulters from "./Defaulters"
import Collection from "./Collection"
import Income from "./Income"
import InvoicesReport from "./Invoices"
import Ledger from "./Ledger"
import Expenses from "./Expenses"
import Salary from "./Salary"
import Classes from "./Classes"
import StudentsReport from "./Students"
import Summary from "./Summary"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ReportPrinter from "./ReportPrinter"
import { withinDateRange } from "@/utils/dateRange"

const REPORT_TABS = [
  { id: "summary", label: "Summary", icon: LayoutGrid },
  { id: "defaulters", label: "Defaulters", icon: Users },
  { id: "classes", label: "Classes", icon: GraduationCap },
  { id: "students", label: "Students", icon: UserSquare },
  { id: "collection", label: "Collection", icon: LayoutDashboard },
  { id: "income", label: "Income", icon: TrendingUp },
  { id: "invoices", label: "Invoices", icon: Receipt },
  { id: "expenses", label: "Expenses", icon: Wallet },
  { id: "salary", label: "Salary", icon: Briefcase },
  { id: "ledger", label: "Ledger", icon: History },
]

const getCalendarYearBasedSessionFromDate = (date) => {
  const year = date.getFullYear();
  return `${year}-${(year + 1).toString().slice(-2)}`;
};

export default function Reports() {
  const [tab, setTab] = useState("summary")
  const { vouchers, pendingDuesList, loading, getUnpaidMonthsCount } = useVouchers()
  const { students } = useStudents()
  const { structures } = useFeeStructures()
  const { methods: paymentMethods } = usePaymentMethods()
  const { invoices } = useInvoices()
  const { products } = useProducts()
  const { expenses, activeHeads } = useExpenses()
  const { workers, selectedMonth: workerMonth } = useWorkers()
  // Date range: empty strings mean "no bound on that side", so the default
  // (both empty) shows everything. The two inputs are inclusive — picking
  // 2026-05-01 → 2026-05-31 returns rows on both endpoints.
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedClassFilter, setSelectedClassFilter] = useState("all")
  const [selectedMethodFilter, setSelectedMethodFilter] = useState("all")
  const [selectedHeadFilter, setSelectedHeadFilter] = useState("all")
  const [selectedInvoiceMethodFilter, setSelectedInvoiceMethodFilter] = useState("all")
  const [selectedSalaryStatus, setSelectedSalaryStatus] = useState("all")
  const [incomeMonth, setIncomeMonth] = useState(new Date().getMonth())
  const [incomeYear, setIncomeYear] = useState(new Date().getFullYear())
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [selectedSession, setSelectedSession] = useState(getCalendarYearBasedSessionFromDate(new Date()))

  // Tabs whose lists are actually filtered by the date range. The other
  // tabs (summary, students, income, salary) ignore selectedDate entirely
  // — students filters by class, income uses month/year, and salary uses
  // the WorkerContext pay period — so we hide the date inputs there.
  const DATE_AWARE_TABS = ["defaulters", "classes", "collection", "invoices", "expenses", "ledger"];
  const showDatePickers = DATE_AWARE_TABS.includes(tab);

  // Tab-scoped filters used to leak between tabs (e.g. picking a class on
  // Defaulters then switching to Income kept the class filter active under
  // the hood). Switching tabs resets every filter to its default so each
  // tab opens clean. Defined after the state hooks so the setters are in
  // scope at function-creation time, not just at call time.
  const switchTab = (next) => {
    if (next === tab) return;
    setTab(next);
    setDateFrom("");
    setDateTo("");
    setSelectedClassFilter("all");
    setSelectedMethodFilter("all");
    setSelectedHeadFilter("all");
    setSelectedInvoiceMethodFilter("all");
    setSelectedSalaryStatus("all");
    setIncomeMonth(new Date().getMonth());
    setIncomeYear(new Date().getFullYear());
    setSelectedStudentId(null);
  };

  const classList = useMemo(() => {
    return structures.map(s => s.className).sort();
  }, [structures]);

  // Gathering data for printing based on current tab and filters
  const activeData = useMemo(() => {
    const inRange = (recordTs) => withinDateRange(recordTs, dateFrom, dateTo);

    if (tab === "defaulters") {
      return [...pendingDuesList]
        .filter(s => inRange(s.updatedAt || s.createdAt))
        .filter(s => !selectedClassFilter || selectedClassFilter === "all" || s.class === selectedClassFilter)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map(student => ({
          name: `${student.firstName} ${student.lastName}`,
          class: student.class || "N/A",
          due: (student.balance || 0).toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }),
          unpaidMonths: getUnpaidMonthsCount(student.id),
        }));
    }

    if (tab === "collection") {
      const dateSet = new Set();
      vouchers.forEach(v => {
        dateSet.add(new Date(v.createdAt).toLocaleDateString());
        if (v.updatedAt) dateSet.add(new Date(v.updatedAt).toLocaleDateString());
      });

      return Array.from(dateSet)
        .map(dateStr => {
          const genOnDay = vouchers.filter(v => new Date(v.createdAt).toLocaleDateString() === dateStr);
          const collectOnDay = vouchers.filter(v => 
            new Date(v.updatedAt || v.createdAt).toLocaleDateString() === dateStr && 
            (selectedMethodFilter === "all" || v.paymentMethod?.toLowerCase() === selectedMethodFilter.toLowerCase())
          );

          const totalCollected = collectOnDay.reduce((sum, v) => sum + Number(v.paidAmount || 0), 0);

          return {
            date: dateStr,
            generated: genOnDay.length,
            paid: genOnDay.filter(v => v.status === "PAID").length,
            unpaid: genOnDay.filter(v => v.status !== "PAID").length,
            amount: `Rs. ${totalCollected.toLocaleString()}`
          };
        })
        .filter(row => inRange(row.date))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    if (tab === "income") {
      const map = {};
      vouchers
        .filter((v) => {
          const d = new Date(v.updatedAt || v.createdAt);
          return d.getMonth() === incomeMonth && d.getFullYear() === incomeYear;
        })
        .forEach((v) => {
          const paid = Number(v.paidAmount || 0);
          if (!paid) return;
          const head = v.month ? `${v.month} Fees` : "Other Fees";
          map[head] = (map[head] || 0) + paid;
        });

      return Object.entries(map)
        .map(([head, amount]) => ({ head, amount: `Rs. ${Math.round(amount).toLocaleString()}` }))
        .sort((a, b) => a.head.localeCompare(b.head));
    }

    if (tab === "invoices") {
      const fmt = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
      return invoices
        .filter((inv) => inRange(inv.invoiceDate || inv.createdAt))
        .filter((inv) => selectedInvoiceMethodFilter === "all" || (inv.paymentMethod || "").toLowerCase() === selectedInvoiceMethodFilter.toLowerCase())
        .sort((a, b) => new Date(a.invoiceDate || a.createdAt) - new Date(b.invoiceDate || b.createdAt))
        .map((inv) => {
          const student = students.find((s) => s.id === inv.studentId);
          const itemCount = (inv.items || []).reduce((sum, it) => sum + Number(it.quantity || 0), 0);
          return {
            date: new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }),
            invoiceNumber: inv.invoiceNumber || "—",
            student: student ? `${student.firstName} ${student.lastName}` : "Unknown",
            items: String(itemCount),
            discount: `${Number(inv.discount || 0)}%`,
            method: inv.paymentMethod || "—",
            grandTotal: fmt(inv.grandTotal),
          };
        });
    }

    if (tab === "classes") {
      const fmt = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
      const list = (selectedClassFilter && selectedClassFilter !== "all"
        ? structures.filter((s) => s.className === selectedClassFilter)
        : structures
      ).map((s) => s.className);

      return list.map((cls) => {
        const inClass = students.filter((st) => st.class === cls);
        const active = inClass.filter((st) => st.status === "ACTIVE");
        const inactive = inClass.filter((st) => st.status !== "ACTIVE");
        const hasDateFilter = !!(dateFrom || dateTo);
        const newAdmissions = hasDateFilter
          ? active.filter((st) => inRange(st.createdAt)).length
          : active.filter((st) => new Date(st.createdAt).getFullYear() === new Date().getFullYear()).length;
        const inactiveScoped = hasDateFilter
          ? inactive.filter((st) => inRange(st.updatedAt)).length
          : inactive.length;
        const classDefaulters = pendingDuesList.filter((d) => d.class === cls);
        const outstanding = classDefaulters.reduce((sum, d) => sum + Number(d.balance || 0), 0);

        return {
          className: cls,
          total: String(active.length),
          newAdmissions: String(newAdmissions),
          defaulters: String(classDefaulters.length),
          inactive: String(inactiveScoped),
          outstanding: outstanding > 0 ? fmt(outstanding) : "—",
          status: active.length > 0 ? "Active" : "Empty",
        };
      });
    }

    if (tab === "students") {
      const fmt = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
      return students
        .filter((s) => selectedClassFilter === "all" || s.class === selectedClassFilter)
        .map((s) => {
          const studentVouchers = vouchers.filter((v) => v.studentId === s.id);
          const totalGenerated = studentVouchers.length;
          const paidCount = studentVouchers.filter((v) => v.status === "PAID").length;
          const totalPaid = studentVouchers.reduce((sum, v) => sum + Number(v.paidAmount || 0), 0);
          const totalFine = studentVouchers.reduce((sum, v) => sum + Number(v.fine || 0), 0);
          const outstanding = studentVouchers.reduce((sum, v) => {
            if (v.status === "PAID") return sum;
            return sum + Math.max(0, Number(v.totalPayable || 0) - Number(v.paidAmount || 0));
          }, 0);
          return {
            name: `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Unknown",
            class: s.class || "—",
            roll: String(s.rollNumber || "—"),
            reg: String(s.regNumber || "—"),
            vouchers: `${totalGenerated} (${paidCount}P)`,
            paid: fmt(totalPaid),
            fines: fmt(totalFine),
            outstanding: outstanding > 0 ? fmt(outstanding) : "—",
            status: s.status !== "ACTIVE" ? "Inactive" : (outstanding > 0 ? "Defaulter" : "Cleared"),
          };
        })
        .sort((a, b) => a.class.localeCompare(b.class) || a.name.localeCompare(b.name));
    }

    if (tab === "expenses") {
      return expenses
        .filter((e) => inRange(e.date))
        .filter((e) => selectedHeadFilter === "all" || e.headId === selectedHeadFilter)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((e) => ({
          date: new Date(e.date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }),
          head: e.head?.name || "—",
          note: e.note || "—",
          method: e.paymentMethod || "—",
          amount: `Rs. ${Math.round(Number(e.amount || 0)).toLocaleString("en-PK")}`,
        }));
    }

    if (tab === "salary") {
      const fmt = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
      let mapped = workers.map((w) => {
        const payment = w.payments?.[0];
        const advanceTotal = (w.advances || []).reduce((s, a) => s + Number(a.amount || 0), 0);
        const overtimeAmount = (w.extraHours || []).reduce((s, e) => s + Number(e.amount || 0), 0);
        const isPaid = !!payment;
        const isActive = w.status === "Active";
        return {
          name: w.name,
          role: w.role || "—",
          salary: fmt(w.monthlySalary),
          overtime: fmt(overtimeAmount),
          advances: fmt(advanceTotal),
          absence: fmt(payment?.absenceDeduction || 0),
          netPaid: fmt(payment?.netPaid || 0),
          method: payment?.method || "—",
          status: !isActive ? "Inactive" : (isPaid ? "Paid" : "Unpaid"),
          isPaid,
          isActive,
        };
      });

      if (selectedSalaryStatus === "paid") mapped = mapped.filter((r) => r.isPaid);
      else if (selectedSalaryStatus === "pending") mapped = mapped.filter((r) => r.isActive && !r.isPaid);
      else if (selectedSalaryStatus === "inactive") mapped = mapped.filter((r) => !r.isActive);

      return mapped.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (tab === "ledger") {
      let filtered = vouchers;

      if (selectedStudentId) {
        filtered = filtered.filter(v => v.studentId === selectedStudentId);
      } else if (selectedClassFilter && selectedClassFilter !== "all") {
        const studentIdsInClass = students.filter(s => s.class === selectedClassFilter).map(s => s.id);
        filtered = filtered.filter(v => studentIdsInClass.includes(v.studentId));
      }

      if (selectedSession && selectedSession !== "all") {
        filtered = filtered.filter(v => getCalendarYearBasedSessionFromDate(new Date(v.dueDate)) === selectedSession);
      }

      const filteredByDate = filtered.filter(v => inRange(v.createdAt));

      return filteredByDate.map((v) => {
        const student = students.find((s) => s.id === v.studentId);
        const paymentDate = v.status !== "UNPAID" && v.updatedAt ? new Date(v.updatedAt) : null;
        const dueDate = new Date(v.dueDate);
        const paymentStatus = paymentDate ? (paymentDate <= dueDate ? "On Time" : "Late") : "N/A";

        return {
          date: new Date(v.createdAt).toLocaleDateString(),
          student: student ? `${student.firstName} ${student.lastName}` : "Unknown",
          type: `${v.month} Fee`,
          totalPayable: (v.totalPayable || 0).toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }),
          paidAmount: (v.paidAmount || 0).toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }),
          status: v.status || "UNPAID",
          paymentDate: paymentDate ? paymentDate.toLocaleDateString() : "N/A",
          paymentStatus: paymentStatus,
          voucherNumber: v.voucherNumber
        };
      });
    }

    return [];
  }, [tab, vouchers, invoices, products, expenses, workers, pendingDuesList, students, dateFrom, dateTo, selectedClassFilter, selectedMethodFilter, selectedHeadFilter, selectedInvoiceMethodFilter, selectedSalaryStatus, incomeMonth, incomeYear, getUnpaidMonthsCount, structures, selectedStudentId, selectedSession])

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header - Styled to match FeeStructure.jsx
          Side-by-side only kicks in at lg+ since the control cluster (filter
          select + date range + clear + print) needs ~640px of breathing room
          on its own — anything narrower overflows. The inner cluster also
          flex-wraps so filters drop to a new line gracefully. */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="shrink-0">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Financial Reports</h2>
          <p className="text-sm text-slate-500 font-medium">Analyze school revenue and student outstanding dues</p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          {(tab === "defaulters" || tab === "classes" || tab === "students") && (
            <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
              <SelectTrigger className="h-10 px-4 rounded-xl text-sm w-[160px] bg-white">
                <SelectValue placeholder="Filter by Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {(classList || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {tab === "collection" && (
            <Select value={selectedMethodFilter} onValueChange={setSelectedMethodFilter}>
              <SelectTrigger className="h-10 px-4 rounded-xl text-sm w-[160px] bg-white">
                <SelectValue placeholder="Filter Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {paymentMethods.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-500 font-medium">
                    No payment methods configured.
                  </div>
                ) : (
                  paymentMethods.map((m) => (
                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          {tab === "invoices" && (
            <Select value={selectedInvoiceMethodFilter} onValueChange={setSelectedInvoiceMethodFilter}>
              <SelectTrigger className="h-10 px-4 rounded-xl text-sm w-[160px] bg-white">
                <SelectValue placeholder="Filter Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {paymentMethods.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-500 font-medium">
                    No payment methods configured.
                  </div>
                ) : (
                  paymentMethods.map((m) => (
                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          {tab === "expenses" && (
            <Select value={selectedHeadFilter} onValueChange={setSelectedHeadFilter}>
              <SelectTrigger className="h-10 px-4 rounded-xl text-sm w-[160px] bg-white">
                <SelectValue placeholder="Filter Head" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Heads</SelectItem>
                {activeHeads.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-500 font-medium">
                    No expense heads configured.
                  </div>
                ) : (
                  activeHeads.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          {showDatePickers && (
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-1">From</span>
                <Input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 px-3 rounded-xl text-sm w-[150px]"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-1">To</span>
                <Input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 px-3 rounded-xl text-sm w-[150px]"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="h-10 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 self-end"
                  title="Clear date range"
                >
                  Clear
                </Button>
              )}
            </div>
          )}
          {tab !== "summary" && (
            <ReportPrinter
              tab={tab}
              data={activeData}
              dateFrom={dateFrom}
              dateTo={dateTo}
              selectedClassFilter={selectedClassFilter}
              selectedMethodFilter={selectedMethodFilter}
              selectedHeadFilter={selectedHeadFilter}
              selectedHeadName={activeHeads.find(h => h.id === selectedHeadFilter)?.name}
              selectedInvoiceMethodFilter={selectedInvoiceMethodFilter}
              selectedIncomePeriod={`${["January","February","March","April","May","June","July","August","September","October","November","December"][incomeMonth]} ${incomeYear}`}
              selectedSalaryStatus={selectedSalaryStatus}
              selectedSalaryMonth={workerMonth}
              selectedSalarySession={(() => {
                const yy = Number((workerMonth || "").split("-")[0]);
                return yy ? `${yy}-${String(yy + 1).slice(-2)}` : null;
              })()}
              selectedStudentId={selectedStudentId}
              selectedSession={selectedSession}
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      {/* Mobile view: Dropdown Menu */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between h-12 px-4 rounded-xl font-bold border-slate-200 bg-white shadow-sm text-slate-700">
              <span className="flex items-center">
                {(() => {
                  const activeTab = REPORT_TABS.find(t => t.id === tab)
                  const ActiveIcon = activeTab?.icon
                  return (
                    <>
                      <ActiveIcon className="w-4 h-4 mr-2 text-emerald-600" />
                      {activeTab?.label}
                    </>
                  )
                })()}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[calc(100vw-3rem)] p-2 rounded-2xl shadow-xl border-slate-100">
            {REPORT_TABS.map((t) => {
              const Icon = t.icon
              return (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => switchTab(t.id)}
                  className={cn(
                    "flex items-center h-11 px-3 rounded-xl font-bold transition-colors cursor-pointer mb-1 last:mb-0",
                    tab === t.id ? "bg-emerald-50 text-emerald-600" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {t.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop view: Horizontal Tabs */}
      <div className="hidden md:flex flex-wrap gap-1 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
        {REPORT_TABS.map((t) => {
          const Icon = t.icon
          return (
            <Button
              key={t.id}
              variant="ghost"
              onClick={() => switchTab(t.id)}
              className={cn(
                "h-8 px-4 rounded-xl font-bold transition-all",
                tab === t.id 
                  ? "bg-white text-emerald-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              <Icon className="w-4 h-4 mr-2" />
              {t.label}
            </Button>
          )
        })}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 font-bold italic">
            Loading reporting data...
          </div>
        ) : (
          <div className="animate-in slide-in-from-bottom-2 duration-300">
            {tab === "summary" && <Summary />}
            {tab === "defaulters" && <Defaulters dateFrom={dateFrom} dateTo={dateTo} selectedClass={selectedClassFilter} />}
            {tab === "collection" && <Collection dateFrom={dateFrom} dateTo={dateTo} methodFilter={selectedMethodFilter} setMethodFilter={setSelectedMethodFilter} />}
            {tab === "classes" && (
              <Classes
                dateFrom={dateFrom}
                dateTo={dateTo}
                classFilter={selectedClassFilter}
                setClassFilter={setSelectedClassFilter}
              />
            )}
            {tab === "students" && (
              <StudentsReport
                classFilter={selectedClassFilter}
                setClassFilter={setSelectedClassFilter}
              />
            )}
            {tab === "income" && (
              <Income
                filterMonth={incomeMonth}
                setFilterMonth={setIncomeMonth}
                filterYear={incomeYear}
                setFilterYear={setIncomeYear}
              />
            )}
            {tab === "invoices" && (
              <InvoicesReport
                dateFrom={dateFrom}
                dateTo={dateTo}
                methodFilter={selectedInvoiceMethodFilter}
                setMethodFilter={setSelectedInvoiceMethodFilter}
              />
            )}
            {tab === "expenses" && (
              <Expenses
                dateFrom={dateFrom}
                dateTo={dateTo}
                headFilter={selectedHeadFilter}
                setHeadFilter={setSelectedHeadFilter}
              />
            )}
            {tab === "salary" && (
              <Salary
                statusFilter={selectedSalaryStatus}
                setStatusFilter={setSelectedSalaryStatus}
              />
            )}
            {tab === "ledger" && (
              <Ledger
                dateFrom={dateFrom}
                dateTo={dateTo}
                selectedClass={selectedClassFilter}
                selectedStudentId={selectedStudentId}
                setSelectedStudentId={setSelectedStudentId}
                selectedSession={selectedSession}
                setSelectedSession={setSelectedSession}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}