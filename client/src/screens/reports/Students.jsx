// Students.jsx — per-student fee summary report
import DataTable from "@/components/shared/DataTable"
import { useStudents } from "@/context/StudentContext"
import { useVouchers } from "@/context/VoucherContext"
import { useFeeStructures } from "@/context/FeeStructureContext"
import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import StudentReportPrinter from "./StudentReportPrinter"

const formatCurrency = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;

export default function Students({ classFilter = "all", setClassFilter }) {
  const { students } = useStudents();
  const { vouchers } = useVouchers();
  const { structures } = useFeeStructures();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const classNames = useMemo(() => structures.map((s) => s.className).sort(), [structures]);

  const data = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return students
      .filter((s) => classFilter === "all" || s.class === classFilter)
      .filter((s) => {
        if (!term) return true;
        const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
        return fullName.includes(term)
          || String(s.rollNumber || "").includes(term)
          || String(s.regNumber || "").includes(term);
      })
      .map((s) => {
        const studentVouchers = vouchers.filter((v) => v.studentId === s.id);
        const totalGenerated = studentVouchers.length;
        const totalPaid = studentVouchers.reduce((sum, v) => sum + Number(v.paidAmount || 0), 0);
        const totalFine = studentVouchers.reduce((sum, v) => sum + Number(v.fine || 0), 0);
        const outstanding = studentVouchers.reduce((sum, v) => {
          if (v.status === "PAID") return sum;
          return sum + Math.max(0, Number(v.totalPayable || 0) - Number(v.paidAmount || 0));
        }, 0);
        const paidCount = studentVouchers.filter((v) => v.status === "PAID").length;
        const unpaidCount = totalGenerated - paidCount;

        return {
          id: s.id,
          name: `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Unknown",
          rollNumber: s.rollNumber || "—",
          regNumber: s.regNumber || "—",
          class: s.class || "—",
          status: s.status,
          totalGenerated,
          paidCount,
          unpaidCount,
          totalPaid,
          totalFine,
          outstanding,
          studentRecord: s,
          vouchers: studentVouchers,
        };
      })
      .sort((a, b) => {
        // Defaulters first within the filtered view
        if ((b.outstanding > 0) !== (a.outstanding > 0)) return b.outstanding - a.outstanding;
        return a.name.localeCompare(b.name);
      });
  }, [students, vouchers, classFilter, searchTerm]);

  const stats = useMemo(() => {
    const totalStudents = data.length;
    const totalPaid = data.reduce((s, r) => s + r.totalPaid, 0);
    const totalOutstanding = data.reduce((s, r) => s + r.outstanding, 0);
    const totalFine = data.reduce((s, r) => s + r.totalFine, 0);
    const defaulters = data.filter((r) => r.outstanding > 0).length;
    return { totalStudents, totalPaid, totalOutstanding, totalFine, defaulters };
  }, [data]);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  useEffect(() => setCurrentPage(1), [classFilter, searchTerm]);

  const columns = [
    {
      header: "Student",
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-slate-800">{row.name}</span>
          <span className="text-[10px] uppercase font-bold text-slate-400">Roll {row.rollNumber} · Reg {row.regNumber}</span>
        </div>
      ),
    },
    {
      header: "Class",
      render: (row) => <span className="font-bold text-slate-700">{row.class}</span>,
    },
    {
      header: "Vouchers",
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-slate-700">{row.totalGenerated}</span>
          <span className="text-[10px] text-slate-400 font-medium">{row.paidCount} paid · {row.unpaidCount} unpaid</span>
        </div>
      ),
    },
    {
      header: "Total Paid",
      render: (row) => <span className="font-mono font-bold text-emerald-600">{formatCurrency(row.totalPaid)}</span>,
    },
    {
      header: "Fines",
      render: (row) => row.totalFine > 0
        ? <span className="font-bold text-amber-600">{formatCurrency(row.totalFine)}</span>
        : <span className="text-slate-300 font-medium">—</span>,
    },
    {
      header: "Outstanding",
      render: (row) => row.outstanding > 0
        ? <span className="font-mono font-black text-red-600">{formatCurrency(row.outstanding)}</span>
        : <span className="text-emerald-500 font-bold text-xs">Cleared</span>,
    },
    {
      header: "Status",
      render: (row) => {
        if (row.status !== "ACTIVE") {
          return <span className="bg-slate-100 text-slate-500 text-[9px] px-2 py-0.5 rounded-full uppercase font-black">Inactive</span>;
        }
        return row.outstanding > 0
          ? <span className="bg-amber-50 text-amber-600 text-[9px] px-2 py-0.5 rounded-full uppercase font-black">Defaulter</span>
          : <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full uppercase font-black">Cleared</span>;
      },
    },
    {
      header: "Detail",
      render: (row) => (
        <StudentReportPrinter student={row.studentRecord} vouchers={row.vouchers} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Students" value={stats.totalStudents} color="blue" />
        <StatCard title="Total Collected" value={formatCurrency(stats.totalPaid)} color="emerald" isCurrency />
        <StatCard title="Outstanding" value={formatCurrency(stats.totalOutstanding)} subtitle={`${stats.defaulters} defaulter${stats.defaulters === 1 ? "" : "s"}`} color="red" isCurrency />
        <StatCard title="Fines Charged" value={formatCurrency(stats.totalFine)} color="amber" isCurrency />
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Student Fee Register</h3>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, roll, or reg #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 w-full sm:w-64 rounded-lg bg-white shadow-sm font-medium text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400">Class:</span>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-40 h-9 rounded-lg bg-white shadow-sm font-bold text-xs">
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

function StatCard({ title, value, subtitle, color, isCurrency }) {
  const colorMap = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    red: "bg-red-600",
  };
  const valueColor = isCurrency
    ? (color === "red" ? "text-red-600" : color === "emerald" ? "text-emerald-600" : color === "amber" ? "text-amber-600" : "text-blue-600")
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
