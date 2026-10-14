import React, { useMemo, useState } from "react";
import { useStudents } from "@/context/StudentContext";
import { useVouchers } from "@/context/VoucherContext";
import { useInvoices } from "@/context/InvoiceContext";
import { useWorkers } from "@/context/WorkerContext";
import { useExpenses } from "@/context/ExpenseContext";
import {
  Users,
  TrendingUp,
  CheckCircle2,
  Wallet,
  Clock,
  ArrowRight,
  ShieldAlert,
  Tag,
  Receipt,
  Plus, // For New Admissions
  MinusCircle, // For Discharged Students
  History,
  Calendar,
  RotateCcw,
  Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Dashboard() {
  const { students } = useStudents();
  const { vouchers, pendingDuesList } = useVouchers();
  const { invoices } = useInvoices();
  const { workers } = useWorkers();
  const { expenses } = useExpenses();

  const currentYear = new Date().getFullYear();
  const startYear = 2026; // Starting historical year
  const futureYearsLimit = 3; // How many years into the future to show
  const years = useMemo(() => {
    const yearsArray = [];
    for (let y = startYear; y <= currentYear + futureYearsLimit; y++) {
      yearsArray.push(y);
    }
    return yearsArray;
  }, [currentYear, futureYearsLimit]);

  // State for Filters and Tabs
  const [activeTab, setActiveTab] = useState("dues"); // "dues" or "activity"
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const isFiltered = useMemo(() => {
    const now = new Date();
    return filterMonth !== now.getMonth() || filterYear !== now.getFullYear();
  }, [filterMonth, filterYear]);

  const resetFilters = () => {
    const now = new Date();
    setFilterMonth(now.getMonth());
    setFilterYear(now.getFullYear());
  };

  // --- Stats Calculations ---
  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();

    const monthlyFeeRevenue = vouchers
      .filter(v => v.status !== "UNPAID" && new Date(v.updatedAt).getMonth() === filterMonth && new Date(v.updatedAt).getFullYear() === filterYear)
      .reduce((sum, v) => sum + (v.paidAmount || 0), 0);

    const monthlyProductRevenue = invoices
      .filter(inv => new Date(inv.createdAt).getMonth() === filterMonth && new Date(inv.createdAt).getFullYear() === filterYear)
      .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    const feeToday = vouchers
      .filter(v => v.status !== "UNPAID" && new Date(v.updatedAt).toDateString() === today)
      .reduce((sum, v) => sum + (v.paidAmount || 0), 0);

    const productToday = invoices
      .filter(inv => new Date(inv.createdAt).toDateString() === today)
      .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    // Calculate soft-deleted/processed students (any status except ACTIVE) for the filtered month/year
    const inactiveStudentsThisMonth = students.filter(s => 
      s.status !== "ACTIVE" && 
      new Date(s.updatedAt).getMonth() === filterMonth && 
      new Date(s.updatedAt).getFullYear() === filterYear).length;

    const targetMonthStr = `${MONTHS[filterMonth]} ${filterYear}`;
    const targetedFeeForMonth = vouchers
      .filter(v => v.month === targetMonthStr)
      .reduce((sum, v) => sum + Number(v.totalPayable || 0), 0);

    const actualFeeForMonth = vouchers
      .filter(v => v.month === targetMonthStr)
      .reduce((sum, v) => sum + Number(v.paidAmount || 0), 0);

    // Workers + salaries — note: payments are pre-filtered by WorkerContext.selectedMonth
    // (not the dashboard's filter), so paid totals reflect whatever month the salary screen is on.
    const activeWorkers = workers.filter(w => w.status === "Active");
    const activeWorkersCount = activeWorkers.length;
    const totalSalaryBill = activeWorkers.reduce((sum, w) => sum + Number(w.monthlySalary || 0), 0);
    const paidSalaries = workers.reduce((sum, w) => sum + Number(w.payments?.[0]?.netPaid || 0), 0);
    const pendingSalaries = Math.max(0, totalSalaryBill - paidSalaries);

    // Expenses scoped to the dashboard's filtered month/year
    const monthlyExpensesList = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
    });
    const monthlyExpensesAmount = monthlyExpensesList.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const monthlyExpensesCount = monthlyExpensesList.length;

    return {
      totalStudents: students.filter(s => s.status === "ACTIVE").length,
      studentsThisMonth: students.filter(s =>
        s.status === "ACTIVE" &&
        new Date(s.createdAt).getMonth() === filterMonth &&
        new Date(s.createdAt).getFullYear() === filterYear).length,
      monthlyRevenue: monthlyFeeRevenue + monthlyProductRevenue,
      monthlyFeeRevenue,
      monthlyProductRevenue,
      paymentsToday: feeToday + productToday,
      feeToday,
      productToday,
      targetedFeeForMonth,
      actualFeeForMonth,
      feeRecoveryPercentage: targetedFeeForMonth > 0 ? ((actualFeeForMonth / targetedFeeForMonth) * 100).toFixed(1) : 0,
      pendingFeeForMonth: Math.max(0, targetedFeeForMonth - actualFeeForMonth),
      defaultersCount: pendingDuesList.length,
      totalPendingAmount: pendingDuesList.reduce((sum, s) => sum + (s.balance || 0), 0),
      inactiveStudentsThisMonth,
      activeWorkersCount,
      totalSalaryBill,
      paidSalaries,
      pendingSalaries,
      monthlyExpensesAmount,
      monthlyExpensesCount,
    };
  }, [students, vouchers, invoices, pendingDuesList, workers, expenses, filterMonth, filterYear]);

  // Combined Recent Activity Logic
  const recentActivities = useMemo(() => {
    const feeActivities = vouchers
      .filter(v => v.status !== "UNPAID")
      .map(v => ({
        id: v.id,
        name: students.find(s => s.id === v.studentId)?.firstName || "Student",
        type: "Fee Payment",
        amount: v.paidAmount,
        date: new Date(v.updatedAt),
        icon: Receipt,
        color: "text-blue-600 bg-blue-50"
      }));

    const saleActivities = invoices.map(inv => ({
      id: inv.id,
      name: students.find(s => s.id === inv.studentId)?.firstName || "Customer",
      type: "Inventory Sale",
      amount: inv.grandTotal,
      date: new Date(inv.createdAt),
      icon: Tag,
      color: "text-emerald-600 bg-emerald-50"
    }));

    return [...feeActivities, ...saleActivities]
      .sort((a, b) => b.date - a.date)
      .slice(0, 6);
  }, [vouchers, invoices, students]);

  const topDefaulters = useMemo(() => {
    return [...pendingDuesList].sort((a, b) => b.balance - a.balance).slice(0, 6);
  }, [pendingDuesList]);

  const chartData = useMemo(() => {
    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthsShort.map((name, i) => {
      const targetMonthStr = `${MONTHS[i]} ${filterYear}`;
      const targeted = vouchers.filter(v => v.month === targetMonthStr).reduce((sum, v) => sum + Number(v.totalPayable || 0), 0);
      const actual = vouchers.filter(v => v.month === targetMonthStr).reduce((sum, v) => sum + Number(v.paidAmount || 0), 0);
      
      const product = invoices.filter(inv => {
        const d = new Date(inv.createdAt);
        return d.getMonth() === i && d.getFullYear() === filterYear;
      }).reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

      return {
        name,
        actual,
        pending: Math.max(0, targeted - actual),
        product,
        rate: targeted > 0 ? Number(((actual / targeted) * 100).toFixed(1)) : 0
      };
    });
  }, [vouchers, invoices, filterYear]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Management Overview</h1>
          <p className="text-slate-500 text-sm font-medium">System status for today, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar size={16} className="text-slate-400 shrink-0" />
            <select 
              value={filterMonth} 
              onChange={(e) => setFilterMonth(parseInt(e.target.value))}
              className="flex-1 sm:flex-none bg-white border border-slate-200 rounded-lg text-xs font-bold h-10 px-3 outline-none hover:border-slate-300 transition-colors min-w-[100px]"
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select 
              value={filterYear} 
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
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
          <div className="flex items-center gap-2 w-full sm:w-auto md:ml-auto">
            <Link to="/reports" className="flex-1 sm:flex-initial">
              <Button variant="outline" className="w-full bg-white border-slate-200 text-slate-600 font-bold text-xs h-10 px-4">
                Export Reports
              </Button>
            </Link>
            <Link to="/fees/vouchers" className="flex-1 sm:flex-initial">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-6 shadow-lg shadow-emerald-600/20">
                Collect Fee
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Students" 
          value={stats.totalStudents} 
          icon={Users} 
          trend={`${stats.studentsThisMonth} new this month`} 
          gradient="from-indigo-600 to-blue-700" 
          linkTo="/students"
        />
        <StatCard 
          label="New Admissions" 
          value={stats.studentsThisMonth} 
          icon={Plus} 
          trend={`This month (${MONTHS[filterMonth]} ${filterYear})`} 
          gradient="from-purple-500 to-pink-600" 
          linkTo="/students"
        />
        <StatCard
          label="Total Staff"
          value={stats.activeWorkersCount}
          icon={Briefcase}
          trend={`Rs. ${stats.totalSalaryBill.toLocaleString()} monthly salary bill`}
          gradient="from-cyan-500 to-blue-600"
          linkTo="/salary"
        />
        <StatCard 
          label={`Total Payable Fee in ${MONTHS[filterMonth]} ${filterYear}`}
          value={`Rs. ${stats.actualFeeForMonth.toLocaleString()}`} 
          icon={TrendingUp} 
          gradient="from-emerald-500 to-teal-600" 
          trend={`Targeted: Rs. ${stats.targetedFeeForMonth.toLocaleString()} (${stats.feeRecoveryPercentage}%)`}
          linkTo="/reports"
        />
        <StatCard 
          label={`Pending Fee in ${MONTHS[filterMonth]} ${filterYear}`}
          value={`Rs. ${stats.pendingFeeForMonth.toLocaleString()}`} 
          icon={Clock} 
          trend="Outstanding for this period" 
          gradient="from-orange-400 to-rose-500" 
          linkTo="/reports"
        />
        <StatCard 
          label="Collected Today" 
          value={`Rs. ${stats.paymentsToday.toLocaleString()}`} 
          icon={CheckCircle2} 
          gradient="from-amber-500 to-orange-600"
          breakdown={[{ label: "Fees", value: stats.feeToday, icon: Receipt }, { label: "Sales", value: stats.productToday, icon: Tag }]} 
          linkTo="/fees/vouchers"
        />
        <StatCard 
          label="Defaulters" 
          value={stats.defaultersCount} 
          icon={ShieldAlert} 
          trend="Pending verification" 
          gradient="from-rose-500 to-pink-600" 
          isAlert={stats.defaultersCount > 0} 
          linkTo="/fees/vouchers"
        />
        <StatCard
          label="Inactive / Discharged"
          value={stats.inactiveStudentsThisMonth}
          icon={MinusCircle}
          trend={`This month (${MONTHS[filterMonth]} ${filterYear})`}
          gradient="from-orange-500 to-red-600"
          linkTo="/students"
        />
        <StatCard
          label="Salaries"
          value={`Rs. ${stats.totalSalaryBill.toLocaleString()}`}
          icon={Wallet}
          gradient="from-violet-500 to-purple-600"
          breakdown={[
            { label: "Paid", value: stats.paidSalaries, icon: CheckCircle2 },
            { label: "Pending", value: stats.pendingSalaries, icon: Clock },
          ]}
          linkTo="/salary"
        />
        <StatCard
          label={`Expenses (${MONTHS[filterMonth]} ${filterYear})`}
          value={`Rs. ${stats.monthlyExpensesAmount.toLocaleString()}`}
          icon={Receipt}
          trend={`${stats.monthlyExpensesCount} ${stats.monthlyExpensesCount === 1 ? "entry" : "entries"} this month`}
          gradient="from-fuchsia-500 to-pink-600"
          linkTo="/expenses"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Revenue Chart */}
        <Card className="lg:col-span-8 border-none shadow-xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-50 pb-6">
            <CardTitle className="text-lg font-bold text-slate-800">Fee Recovery Performance ({filterYear})</CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} unit="%" />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }} 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} 
                    formatter={(value, name, entry) => [entry.dataKey === 'rate' ? `${value}%` : `Rs. ${value.toLocaleString()}`, name]}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px' }} />
                  <Bar yAxisId="left" dataKey="actual" name="Fee Collection" stackId="fee" fill="#4f46e5" barSize={20} />
                  <Bar yAxisId="left" dataKey="pending" name="Collection Gap" stackId="fee" fill="#c7d2fe" radius={[6, 6, 0, 0]} barSize={20} />
                  <Bar yAxisId="left" dataKey="product" name="Product Sales" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                  <Line yAxisId="right" type="monotone" dataKey="rate" name="Recovery Rate" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Side Column (Dues & Activity) */}
        <Card className="lg:col-span-4 border-none shadow-xl shadow-slate-200/50 bg-white rounded-3xl overflow-hidden flex flex-col">
          <div className="flex border-b border-slate-50">
            <button
              onClick={() => setActiveTab("dues")}
              className={cn(
                "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all",
                activeTab === "dues" ? "text-rose-600 bg-rose-50/30 border-b-2 border-rose-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              High Dues
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={cn(
                "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all",
                activeTab === "activity" ? "text-emerald-600 bg-emerald-50/30 border-b-2 border-emerald-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Activities
            </button>
          </div>

          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[450px]">
            <div className="divide-y divide-slate-50">
              {activeTab === "dues" ? (
                topDefaulters.map((student, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors animate-in fade-in slide-in-from-right-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{student.firstName.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{student.firstName} {student.lastName}</p>
                        <p className="text-[10px] text-slate-400 font-bold italic">Class: {student.class}</p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-rose-600">Rs.{student.balance.toLocaleString()}</p>
                  </div>
                ))
              ) : (
                recentActivities.map((act, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors animate-in fade-in slide-in-from-left-2">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", act.color)}>
                        <act.icon size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{act.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{act.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800">Rs.{act.amount.toLocaleString()}</p>
                      <p className="text-[9px] text-slate-400 font-medium">{act.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))
              )}
              {(activeTab === "dues" ? topDefaulters : recentActivities).length === 0 && (
                <div className="p-12 text-center text-slate-400 text-sm italic">No data available.</div>
              )}
            </div>
          </CardContent>

          <div className="p-4 bg-slate-50/50 border-t border-slate-50">
            <Button variant="ghost" className="w-full text-xs font-bold text-slate-500 hover:text-slate-700 group">
              View Full History <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Recovery Banner */}
      <div className="bg-[#0F172A] rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
            <Wallet className="text-emerald-400 w-8 h-8" />
          </div>
          <div>
            <h4 className="text-xl font-bold">Total Recovery Pending</h4>
            <p className="text-slate-400 text-sm">Combined institution-wide balance.</p>
          </div>
        </div>
        <div className="text-center md:text-right">
          <p className="text-3xl font-black text-emerald-400">Rs. {stats.totalPendingAmount.toLocaleString()}</p>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Outstanding Balance</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, gradient, trend, isAlert, breakdown, linkTo }) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl p-6 text-white shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br", gradient)}>
      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        <div className="flex justify-between items-start">
          <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl shadow-inner"><Icon size={20} /></div>
          {isAlert && <div className="w-2 h-2 rounded-full bg-white animate-ping" />}
        </div>
        <div>
          <h3 className="text-3xl font-black tracking-tight leading-none">{value}</h3>
          <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.15em] mt-2">{label}</p>
        </div>
        <div className="space-y-3 pt-3 border-t border-white/10">
          {breakdown ? (
            <div className="grid grid-cols-2 gap-2">
              {breakdown.map((item, i) => (
                <div key={i} className="flex flex-col">
                  <div className="flex items-center gap-1 opacity-70 mb-0.5"><item.icon size={10} /><span className="text-[9px] font-bold uppercase">{item.label}</span></div>
                  <span className="text-xs font-bold leading-none">Rs. {item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : <div className="text-[10px] font-bold flex items-center gap-1.5 opacity-80">{trend}</div>}
          
          {linkTo && (
            <Link to={linkTo} className="flex items-center justify-between group/link bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 transition-all duration-300 mt-2 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-90">View Details</span>
              <div className="bg-white/10 p-1.5 rounded-lg group-hover/link:translate-x-1 transition-transform">
                <ArrowRight size={12} />
              </div>
            </Link>
          )}
          </div>
      </div>
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
    </div>
  );
}