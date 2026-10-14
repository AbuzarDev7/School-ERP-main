import { Users, ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" // Card remains for reference if needed elsewhere
import { useVouchers } from "@/context/VoucherContext"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function PendingDuesTab() {
  const { pendingDuesList, totalOutstanding, loading } = useVouchers()
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const totalPages = Math.ceil(pendingDuesList.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;

  const paginatedDuesList = pendingDuesList.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 flex justify-between items-center relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <ArrowUpRight size={80} className="text-red-600" />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase text-red-600 tracking-widest mb-1">Total Outstanding</p>
              <h3 className="text-4xl font-black text-slate-900 leading-none">Rs. {totalOutstanding.toLocaleString()}</h3>
           </div>
           <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-sm">
              <ArrowUpRight size={28} />
           </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users size={80} className="text-blue-600" />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Defaulters Count</p>
              <h3 className="text-4xl font-black text-slate-900 leading-none">{pendingDuesList.length}</h3>
           </div>
           <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
              <Users size={28} />
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 border-b bg-slate-50/50">
           <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Defaulting Students Registry</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-lg border-collapse">
            <thead className="bg-slate-100 border-b-2 border-slate-200">
               <tr>
                  <th className="px-8 py-5 text-left text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Student Name</th>
                  <th className="px-8 py-5 text-left text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Class</th>
                  <th className="px-8 py-5 text-left text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Pending Balance</th>
               </tr>
            </thead>
            <tbody>
               {loading ? (
                 <tr><td colSpan={3} className="p-12 text-center text-slate-400 font-bold italic bg-white">Loading dues registry...</td></tr>
               ) : pendingDuesList.length === 0 ? (
                 <tr><td colSpan={3} className="p-12 text-center text-slate-400 font-bold italic bg-white">No pending dues found. All accounts settled.</td></tr>
               ) : (
                 paginatedDuesList.map((s, i) => {
                   // Match DataTable's zebra stripe so the dues registry stays
                   // visually consistent with the rest of the app.
                   const rowBg = i % 2 === 0 ? "bg-white" : "bg-slate-50";
                   return (
                   <tr key={s.id} className={`${rowBg} border-b border-slate-200 hover:bg-slate-100 transition-colors`}>
                     <td className="px-8 py-5 font-bold text-slate-700 border-r border-slate-200 last:border-r-0">{s.firstName} {s.lastName}</td>
                     <td className="px-8 py-5 text-slate-500 font-medium border-r border-slate-200 last:border-r-0">{s.class}</td>
                     <td className="px-8 py-5 border-r border-slate-200 last:border-r-0">
                        <span className="text-red-600 font-black text-base">Rs. {s.balance.toLocaleString()}</span>
                     </td>
                   </tr>
                   );
                 })
               )}
            </tbody>
          </table>
        </div>

        {/* Pagination UI */}
        <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-slate-50/50 gap-4">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-tight">
            Showing <span className="text-slate-900">{pendingDuesList.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, pendingDuesList.length)}</span> of <span className="text-slate-900">{pendingDuesList.length}</span> Results
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