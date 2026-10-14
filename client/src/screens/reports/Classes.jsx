// Classes.jsx — class-wise summary report (one row per class defined in FeeStructure)
import DataTable from "@/components/shared/DataTable"
import { useStudents } from "@/context/StudentContext"
import { useFeeStructures } from "@/context/FeeStructureContext"
import { useVouchers } from "@/context/VoucherContext"
import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import ClassReportPrinter from "./ClassReportPrinter"
import { withinDateRange } from "@/utils/dateRange"

const formatCurrency = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;

export default function Classes({ dateFrom, dateTo, classFilter = "all", setClassFilter }) {
  const { students } = useStudents();
  const { structures } = useFeeStructures();
  const { pendingDuesList } = useVouchers();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const classNames = useMemo(() => structures.map((s) => s.className).sort(), [structures]);

  const data = useMemo(() => {
    const hasDateFilter = !!(dateFrom || dateTo);
    const isInWindow = (raw) => withinDateRange(raw, dateFrom, dateTo);

    const list = (classFilter === "all" ? classNames : classNames.filter((c) => c === classFilter));

    return list.map((cls) => {
      const inClass = students.filter((s) => s.class === cls);
      const active = inClass.filter((s) => s.status === "ACTIVE");
      const inactive = inClass.filter((s) => s.status !== "ACTIVE");

      // New admissions: filtered to the selected range when provided, else all-time
      const newAdmissions = hasDateFilter
        ? active.filter((s) => isInWindow(s.createdAt)).length
        : active.length === 0 ? 0 : active.filter((s) => {
            // For all-time view, show admissions in the current calendar year as "recent"
            const now = new Date();
            return new Date(s.createdAt).getFullYear() === now.getFullYear();
          }).length;

      // Inactive within the selected range; without a date filter, count all inactive
      const inactiveScoped = hasDateFilter
        ? inactive.filter((s) => isInWindow(s.updatedAt)).length
        : inactive.length;

      const classDefaulters = pendingDuesList.filter((d) => d.class === cls);
      const outstanding = classDefaulters.reduce((sum, d) => sum + Number(d.balance || 0), 0);

      return {
        className: cls,
        total: active.length,
        totalAll: inClass.length,
        newAdmissions,
        defaulters: classDefaulters.length,
        outstanding,
        outstandingDisplay: formatCurrency(outstanding),
        inactive: inactiveScoped,
        // Raw data for the per-class print
        students: inClass,
        defaultersList: classDefaulters,
      };
    });
  }, [students, structures, pendingDuesList, classNames, dateFrom, dateTo, classFilter]);

  const stats = useMemo(() => {
    const totalClasses = data.length;
    const totalStudents = data.reduce((s, r) => s + r.total, 0);
    const totalDefaulters = data.reduce((s, r) => s + r.defaulters, 0);
    const totalOutstanding = data.reduce((s, r) => s + r.outstanding, 0);
    const totalNew = data.reduce((s, r) => s + r.newAdmissions, 0);
    return { totalClasses, totalStudents, totalDefaulters, totalOutstanding, totalNew };
  }, [data]);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  useEffect(() => setCurrentPage(1), [dateFrom, dateTo, classFilter]);

  const columns = [
    {
      header: "Class",
      accessor: "className",
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-slate-800">{row.className}</span>
          <span className="text-[10px] uppercase font-bold text-slate-400">{row.totalAll} on roll</span>
        </div>
      ),
    },
    {
      header: "Active Students",
      render: (row) => <span className="font-bold text-emerald-600">{row.total}</span>,
    },
    {
      header: "New Admissions",
      render: (row) => <span className="font-bold text-blue-600">{row.newAdmissions}</span>,
    },
    {
      header: "Defaulters",
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-red-600">{row.defaulters}</span>
          {row.outstanding > 0 && (
            <span className="text-[10px] text-slate-400 font-medium">{row.outstandingDisplay}</span>
          )}
        </div>
      ),
    },
    {
      header: "Inactive / Discharged",
      render: (row) => <span className="font-bold text-slate-500">{row.inactive}</span>,
    },
    {
      header: "Status",
      render: (row) => (
        row.total > 0
          ? <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full uppercase font-black">Active</span>
          : <span className="bg-slate-100 text-slate-500 text-[9px] px-2 py-0.5 rounded-full uppercase font-black">Empty</span>
      ),
    },
    {
      header: "Detail",
      render: (row) => (
        <ClassReportPrinter
          className={row.className}
          students={row.students}
          defaulters={row.defaultersList}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Classes" value={stats.totalClasses} color="blue" />
        <StatCard title="Active Students" value={stats.totalStudents} color="emerald" />
        <StatCard title="New Admissions" value={stats.totalNew} color="amber" />
        <StatCard title="Defaulters" value={stats.totalDefaulters} subtitle={stats.totalOutstanding > 0 ? formatCurrency(stats.totalOutstanding) : ""} color="red" />
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Class-wise Register</h3>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Filter By:</span>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-44 h-9 rounded-lg bg-white shadow-sm font-bold text-xs">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classNames.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-500 font-medium">
                    No fee structures configured.
                  </div>
                ) : (
                  classNames.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <DataTable columns={columns} data={paginatedData} />
        </div>

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

function StatCard({ title, value, subtitle, color }) {
  const colorMap = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    red: "bg-red-600",
  };

  return (
    <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
      <div className={`h-1 ${colorMap[color] || 'bg-slate-200'} w-full`} />
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-black truncate text-slate-800">{value}</div>
        {subtitle && <div className="text-[11px] font-bold text-slate-400 mt-1 truncate">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}
