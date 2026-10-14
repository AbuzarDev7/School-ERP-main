// Income.jsx — fee collection income (separate from product sales, see Invoices report)
import DataTable from "@/components/shared/DataTable"
import { useVouchers } from "@/context/VoucherContext"
import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Income({ filterMonth, setFilterMonth, filterYear, setFilterYear }) {
  const { vouchers } = useVouchers()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const currentYear = new Date().getFullYear();
  const startYear = 2026;
  const futureYearsLimit = 3;
  const years = useMemo(() => {
    const arr = [];
    for (let y = startYear; y <= currentYear + futureYearsLimit; y++) arr.push(y);
    return arr;
  }, [currentYear]);

  const isFiltered = useMemo(() => {
    const now = new Date();
    return filterMonth !== now.getMonth() || filterYear !== now.getFullYear();
  }, [filterMonth, filterYear]);

  const resetFilters = () => {
    const now = new Date();
    setFilterMonth(now.getMonth());
    setFilterYear(now.getFullYear());
  };

  // Aggregate total paid amount per fee type within the selected month/year
  const data = useMemo(() => {
    const incomeMap = {};
    vouchers
      .filter((v) => {
        const d = new Date(v.updatedAt || v.createdAt);
        return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
      })
      .forEach((v) => {
        const paid = Number(v.paidAmount || 0);
        if (!paid) return;
        const head = v.month ? `${v.month} Fees` : "Other Fees";
        incomeMap[head] = (incomeMap[head] || 0) + paid;
      });

    return Object.entries(incomeMap)
      .map(([head, amount]) => ({
        head,
        amount: `Rs. ${Math.round(amount).toLocaleString()}`,
      }))
      .sort((a, b) => a.head.localeCompare(b.head));
  }, [vouchers, filterMonth, filterYear])

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  useEffect(() => setCurrentPage(1), [filterMonth, filterYear]);

  const columns = [
    {
      header: "Category",
      accessor: "head",
      render: (row) => <span className="font-bold text-slate-700">{row.head}</span>
    },
    {
      header: "Total Income",
      accessor: "amount",
      render: (row) => <span className="font-mono font-bold text-emerald-600">{row.amount}</span>
    },
  ]

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
      <div className="p-6 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Fee Collection Income</h3>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{MONTHS[filterMonth]} {filterYear}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={16} className="text-slate-400 shrink-0" />
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(parseInt(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg text-xs font-bold h-9 px-3 outline-none hover:border-slate-300 transition-colors min-w-25"
          >
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg text-xs font-bold h-9 px-3 outline-none hover:border-slate-300 transition-colors"
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
              className="h-9 w-9 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg animate-in fade-in zoom-in duration-300"
              title="Reset to current month"
            >
              <RotateCcw size={14} />
            </Button>
          )}
        </div>
      </div>

      <DataTable columns={columns} data={paginatedData} />

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
  )
}
