// Invoices.jsx — sales / invoices report (separate from fee Income)
import DataTable from "@/components/shared/DataTable"
import { useInvoices } from "@/context/InvoiceContext"
import { useStudents } from "@/context/StudentContext"
import { usePaymentMethods } from "@/context/PaymentMethodContext"
import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { withinDateRange } from "@/utils/dateRange"

const formatCurrency = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
const formatDate = (raw) => raw ? new Date(raw).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function Invoices({ dateFrom, dateTo, methodFilter = "all", setMethodFilter }) {
  const { invoices } = useInvoices();
  const { students } = useStudents();
  const { activeMethods } = usePaymentMethods();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    return invoices
      .filter((inv) => withinDateRange(inv.invoiceDate || inv.createdAt, dateFrom, dateTo))
      .filter((inv) => methodFilter === "all" || (inv.paymentMethod || "").toLowerCase() === methodFilter.toLowerCase())
      .sort((a, b) => new Date(a.invoiceDate || a.createdAt) - new Date(b.invoiceDate || b.createdAt));
  }, [invoices, dateFrom, dateTo, methodFilter]);

  const data = useMemo(() => filtered.map((inv) => {
    const student = students.find((s) => s.id === inv.studentId);
    const itemCount = (inv.items || []).reduce((sum, it) => sum + Number(it.quantity || 0), 0);
    return {
      id: inv.id,
      date: formatDate(inv.invoiceDate || inv.createdAt),
      invoiceNumber: inv.invoiceNumber || "—",
      student: student ? `${student.firstName} ${student.lastName}` : "Unknown",
      itemCount,
      lineCount: (inv.items || []).length,
      discount: Number(inv.discount || 0),
      method: inv.paymentMethod || "—",
      grandTotalRaw: Number(inv.grandTotal || 0),
      grandTotal: formatCurrency(inv.grandTotal),
    };
  }), [filtered, students]);

  const stats = useMemo(() => {
    const total = data.reduce((sum, r) => sum + r.grandTotalRaw, 0);
    const count = data.length;
    const avg = count > 0 ? total / count : 0;

    const byMethod = {};
    data.forEach((r) => {
      if (r.method && r.method !== "—") byMethod[r.method] = (byMethod[r.method] || 0) + r.grandTotalRaw;
    });
    const topEntry = Object.entries(byMethod).sort((a, b) => b[1] - a[1])[0];
    const topMethod = topEntry ? topEntry[0] : "—";
    const topMethodAmount = topEntry ? topEntry[1] : 0;

    return { total, count, avg, topMethod, topMethodAmount };
  }, [data]);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  useEffect(() => setCurrentPage(1), [dateFrom, dateTo, methodFilter]);

  const columns = [
    {
      header: "Date",
      accessor: "date",
      render: (row) => <span className="font-medium text-slate-500">{row.date}</span>,
    },
    {
      header: "Invoice #",
      accessor: "invoiceNumber",
      render: (row) => <span className="font-mono font-bold text-blue-600">{row.invoiceNumber}</span>,
    },
    {
      header: "Student",
      accessor: "student",
      render: (row) => <span className="font-bold text-slate-800">{row.student}</span>,
    },
    {
      header: "Items",
      render: (row) => (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-slate-700">{row.itemCount}</span>
          <span className="text-[10px] text-slate-400 font-medium">{row.lineCount} {row.lineCount === 1 ? "line" : "lines"}</span>
        </div>
      ),
    },
    {
      header: "Discount",
      render: (row) => row.discount > 0
        ? <span className="font-bold text-amber-600">{row.discount}%</span>
        : <span className="text-slate-300 font-medium">—</span>,
    },
    {
      header: "Method",
      render: (row) => row.method !== "—"
        ? <span className="capitalize font-bold text-slate-700">{row.method}</span>
        : <span className="text-slate-300 font-medium">—</span>,
    },
    {
      header: "Grand Total",
      render: (row) => <span className="font-mono font-black text-emerald-600">{row.grandTotal}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Invoices" value={stats.count} color="blue" />
        <StatCard title="Total Sales" value={formatCurrency(stats.total)} color="emerald" isCurrency />
        <StatCard title="Average / Invoice" value={formatCurrency(stats.avg)} color="amber" isCurrency />
        <StatCard
          title="Top Method"
          value={stats.topMethod}
          subtitle={stats.topMethodAmount > 0 ? formatCurrency(stats.topMethodAmount) : ""}
          color="slate"
        />
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Sales Register</h3>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Filter By:</span>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-44 h-9 rounded-lg bg-white shadow-sm font-bold text-xs">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {activeMethods.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-500 font-medium">
                    No payment methods configured.
                  </div>
                ) : (
                  activeMethods.map((m) => (
                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
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

function StatCard({ title, value, subtitle, color, isCurrency }) {
  const colorMap = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    slate: "bg-slate-600",
  };
  const valueColor = isCurrency
    ? (color === "emerald" ? "text-emerald-600" : "text-blue-600")
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
