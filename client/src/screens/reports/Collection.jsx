// Collection.jsx
import DataTable from "@/components/shared/DataTable"
import { useVouchers } from "@/context/VoucherContext"
import { usePaymentMethods } from "@/context/PaymentMethodContext"
import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { withinDateRange } from "@/utils/dateRange"

export default function Collection({ dateFrom, dateTo, methodFilter = "all", setMethodFilter }) {
  const { vouchers } = useVouchers()
  const { methods } = usePaymentMethods()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const data = useMemo(() => {
    const dateSet = new Set();
    vouchers.forEach(v => {
      dateSet.add(new Date(v.createdAt).toLocaleDateString());
      if (v.updatedAt) dateSet.add(new Date(v.updatedAt).toLocaleDateString());
    });

    const sortedDates = Array.from(dateSet).sort((a, b) => new Date(a) - new Date(b));

    return sortedDates.map(dateStr => {
      const genOnDay = vouchers.filter(v => new Date(v.createdAt).toLocaleDateString() === dateStr);
      const collectOnDay = vouchers.filter(v =>
        new Date(v.updatedAt || v.createdAt).toLocaleDateString() === dateStr &&
        Number(v.paidAmount || 0) > 0 &&
        (methodFilter === "all" || v.paymentMethod?.toLowerCase() === methodFilter.toLowerCase())
      );

      const totalCollected = collectOnDay.reduce((sum, v) => sum + Number(v.paidAmount || 0), 0);

      return {
        date: dateStr,
        generated: genOnDay.length,
        paid: genOnDay.filter(v => v.status === "PAID").length,
        unpaid: genOnDay.filter(v => v.status !== "PAID").length,
        amount: totalCollected,
        amountDisplay: `Rs. ${totalCollected.toLocaleString()}`
      };
    }).filter(row => withinDateRange(row.date, dateFrom, dateTo));
  }, [vouchers, dateFrom, dateTo, methodFilter])

  const totals = useMemo(() => {
    return data.reduce((acc, row) => ({
      gen: acc.gen + row.generated,
      paid: acc.paid + row.paid,
      unpaid: acc.unpaid + row.unpaid,
      amt: acc.amt + row.amount
    }), { gen: 0, paid: 0, unpaid: 0, amt: 0 });
  }, [data]);

  // Collection per payment method, scoped to the selected range if any
  // (ignores method filter so the strip always shows every method's contribution).
  const perMethodTotals = useMemo(() => {
    const totalsByMethod = {};
    vouchers.forEach((v) => {
      const paid = Number(v.paidAmount || 0);
      if (!paid || !v.paymentMethod) return;
      if (!withinDateRange(v.updatedAt || v.createdAt, dateFrom, dateTo)) return;
      const key = v.paymentMethod;
      totalsByMethod[key] = (totalsByMethod[key] || 0) + paid;
    });
    return totalsByMethod;
  }, [vouchers, dateFrom, dateTo]);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  useEffect(() => setCurrentPage(1), [dateFrom, dateTo]);

  const columns = [
    { 
      header: "Date", 
      accessor: "date",
      render: (row) => <span className="font-medium text-slate-500">{row.date}</span>
    },
    { 
      header: "Generated", 
      accessor: "generated",
      render: (row) => <span className="font-bold text-slate-700">{row.generated}</span>
    },
    { 
      header: "Paid", 
      render: (row) => <span className="text-emerald-600 font-bold">{row.paid}</span>
    },
    { 
      header: "Unpaid", 
      render: (row) => <span className="text-amber-600 font-bold">{row.unpaid}</span>
    },
    { 
      header: "Total Collected", 
      accessor: "amountDisplay",
      render: (row) => <span className="font-mono font-black text-blue-600">{row.amountDisplay}</span>
    },
  ]

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Vouchers Generated" value={totals.gen} color="blue" />
        <StatCard title="Paid Vouchers" value={totals.paid} color="emerald" />
        <StatCard title="Unpaid / Partial" value={totals.unpaid} color="amber" />
        <StatCard title="Net Collection" value={`Rs. ${totals.amt.toLocaleString()}`} color="blue" isCurrency />
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Daily Collection Summary</h3>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Filter By:</span>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-40 h-9 rounded-lg bg-white shadow-sm font-bold text-xs">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {methods.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-500 font-medium">
                    No payment methods configured.
                  </div>
                ) : (
                  methods.map((m) => (
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
    </div>
  )
}

function StatCard({ title, value, color, isCurrency }) {
  const colorMap = {
    blue: "bg-blue-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
  };

  return (
    <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
      <div className={`h-1 ${colorMap[color] || 'bg-slate-200'} w-full`} />
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`text-3xl font-black ${isCurrency ? 'text-blue-600' : 'text-slate-800'}`}>{value}</div>
      </CardContent>
    </Card>
  );
}