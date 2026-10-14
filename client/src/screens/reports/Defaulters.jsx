// Defaulters.jsx
import DataTable from "@/components/shared/DataTable"
import { useVouchers } from "@/context/VoucherContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { withinDateRange } from "@/utils/dateRange"

export default function Defaulters({ dateFrom, dateTo, selectedClass }) {
  const { pendingDuesList, totalOutstanding, loading, getUnpaidMonthsCount } = useVouchers()
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const data = useMemo(() => {
    const filtered = [...pendingDuesList]
      .filter(s => withinDateRange(s.updatedAt || s.createdAt, dateFrom, dateTo))
      .filter(s => !selectedClass || selectedClass === "all" || s.class === selectedClass)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((student) => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        class: student.class || "N/A",
        due: `Rs. ${(student.balance || 0).toLocaleString()}`,
        balance: student.balance || 0,
        unpaidMonths: getUnpaidMonthsCount(student.id),
      }))

    return filtered;
  }, [pendingDuesList, dateFrom, dateTo, selectedClass, getUnpaidMonthsCount])

  const classStats = useMemo(() => {
    const classDues = data.reduce((sum, s) => sum + s.balance, 0);
    return {
      count: data.length,
      amount: classDues
    };
  }, [data]);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  const columns = useMemo(() => [
    {
      header: "Student", 
      accessor: "name",
      render: (row) => <span className="font-bold text-slate-700">{row.name}</span>
    },
    { 
      header: "Class", 
      accessor: "class",
      render: (row) => <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold">{row.class}</Badge>,
    },
    {
      header: "Due Amount", 
      accessor: "due",
      render: (row) => <span className="text-red-600 font-black font-mono">{row.due}</span>
    },
    {
      header: "Months Due",
      render: (row) => (
        <Badge 
          variant="outline" 
          className={cn(
            "font-black text-[10px]",
            row.unpaidMonths >= 3 ? "bg-red-50 text-red-600 border-red-200" : 
            row.unpaidMonths === 1 ? "bg-amber-50 text-amber-600 border-amber-200" :
            "bg-slate-50 text-slate-500 border-slate-200"
          )}
        >
          {row.unpaidMonths} {row.unpaidMonths === 1 ? 'Month' : 'Months'}
        </Badge>
      )
    }
  ], []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
          <div className="h-1 bg-slate-200 w-full" />
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              {selectedClass && selectedClass !== "all" ? `${selectedClass} Defaulters` : "Total Defaulters"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-black text-slate-800">{classStats.count} <span className="text-sm font-medium text-slate-400">Students</span></div>
          </CardContent>
        </Card>
        <Card className="border border-red-100 shadow-sm bg-red-50/50 rounded-3xl overflow-hidden">
          <div className="h-1 bg-red-400 w-full" />
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-[11px] font-bold text-red-600 uppercase tracking-widest">
              {selectedClass && selectedClass !== "all" ? `${selectedClass} Pending` : "Class Balance"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-black text-red-700">{classStats.amount.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}</div>
          </CardContent>
        </Card>
        <Card className="border border-slate-800 shadow-sm bg-slate-900 rounded-3xl overflow-hidden">
          <div className="h-1 bg-emerald-500 w-full" />
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Institution Dues</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-black text-white">{totalOutstanding.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' })}</div>
          </CardContent>
        </Card>
      </div>
      {loading ? (
        <div className="p-12 text-center text-slate-400 italic">Generating report...</div>
      ) : (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={paginatedData} />
          </div>

          {/* Pagination */}
          <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-slate-50/50 gap-4">
            <div className="text-sm font-bold text-slate-400 uppercase tracking-tight">
              Showing <span className="text-slate-900">{data.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, data.length)}</span> of <span className="text-slate-900">{data.length}</span> Results
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400">Rows:</span>
                <Select value={pageSize.toString()} onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}>
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
      )}
    </div>
  )
}