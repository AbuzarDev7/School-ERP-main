// Expenses.jsx — financial expenses report
import DataTable from "@/components/shared/DataTable"
import { useExpenses } from "@/context/ExpenseContext"
import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { withinDateRange } from "@/utils/dateRange"

const formatCurrency = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
const formatDate = (raw) => raw ? new Date(raw).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function Expenses({ dateFrom, dateTo, headFilter = "all", setHeadFilter }) {
  const { expenses, activeHeads } = useExpenses();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => withinDateRange(e.date, dateFrom, dateTo))
      .filter((e) => headFilter === "all" || e.headId === headFilter)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [expenses, dateFrom, dateTo, headFilter]);

  const data = useMemo(() => filtered.map((e) => ({
    id: e.id,
    date: formatDate(e.date),
    head: e.head?.name || "—",
    note: e.note || "—",
    method: e.paymentMethod || "—",
    amount: Number(e.amount || 0),
    amountDisplay: formatCurrency(e.amount),
  })), [filtered]);

  const stats = useMemo(() => {
    const total = data.reduce((sum, r) => sum + r.amount, 0);
    const count = data.length;
    const avg = count > 0 ? total / count : 0;

    // Largest head by spend in the filtered view
    const byHead = {};
    data.forEach((r) => {
      byHead[r.head] = (byHead[r.head] || 0) + r.amount;
    });
    const topEntry = Object.entries(byHead).sort((a, b) => b[1] - a[1])[0];
    const topHead = topEntry ? `${topEntry[0]}` : "—";
    const topHeadAmount = topEntry ? topEntry[1] : 0;

    return { total, count, avg, topHead, topHeadAmount };
  }, [data]);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  useEffect(() => setCurrentPage(1), [dateFrom, dateTo, headFilter]);

  const columns = [
    {
      header: "Date",
      accessor: "date",
      render: (row) => <span className="font-medium text-slate-500">{row.date}</span>,
    },
    {
      header: "Head",
      accessor: "head",
      render: (row) => <span className="font-bold text-slate-800">{row.head}</span>,
    },
    {
      header: "Description",
      accessor: "note",
      render: (row) => <span className="text-slate-500 italic">{row.note}</span>,
    },
    {
      header: "Method",
      accessor: "method",
      render: (row) => row.method !== "—"
        ? <span className="capitalize font-bold text-slate-700">{row.method}</span>
        : <span className="text-slate-300 font-medium">—</span>,
    },
    {
      header: "Amount",
      accessor: "amountDisplay",
      render: (row) => <span className="font-mono font-black text-red-600">{row.amountDisplay}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Entries" value={stats.count} color="blue" />
        <StatCard title="Total Spent" value={formatCurrency(stats.total)} color="red" isCurrency />
        <StatCard title="Average / Entry" value={formatCurrency(stats.avg)} color="amber" isCurrency />
        <StatCard
          title="Top Head"
          value={stats.topHead}
          subtitle={stats.topHeadAmount > 0 ? formatCurrency(stats.topHeadAmount) : ""}
          color="emerald"
        />
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Expense Register</h3>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Filter By:</span>
            <Select value={headFilter} onValueChange={setHeadFilter}>
              <SelectTrigger className="w-44 h-9 rounded-lg bg-white shadow-sm font-bold text-xs">
                <SelectValue placeholder="All Heads" />
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
    red: "bg-red-600",
    amber: "bg-amber-500",
    emerald: "bg-emerald-600",
  };

  return (
    <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
      <div className={`h-1 ${colorMap[color] || 'bg-slate-200'} w-full`} />
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`text-3xl font-black truncate ${isCurrency ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
        {subtitle && <div className="text-[11px] font-bold text-slate-400 mt-1 truncate">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}
