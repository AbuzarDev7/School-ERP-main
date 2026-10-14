// Ledger.jsx
import DataTable from "@/components/shared/DataTable"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useVouchers } from "@/context/VoucherContext"
import { useStudents } from "@/context/StudentContext"
import { useFeeStructures } from "@/context/FeeStructureContext"
import { useMemo, useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { withinDateRange } from "@/utils/dateRange"

const getCalendarYearBasedSessionFromDate = (date) => {
  const year = date.getFullYear();
  return `${year}-${(year + 1).toString().slice(-2)}`;
};

const getPaymentStatus = (paymentDate, dueDate) => {
  if (!paymentDate) return "N/A";
  const payment = new Date(paymentDate);
  const due = new Date(dueDate);

  // Normalize to start of day for accurate comparison
  payment.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  if (payment <= due) {
    return "On Time";
  } else {
    return "Late";
  }
};

export default function Ledger({ dateFrom, dateTo, selectedClass, selectedStudentId, setSelectedStudentId, selectedSession, setSelectedSession }) {
  const { vouchers } = useVouchers()
  const { students } = useStudents()
  const { structures } = useFeeStructures()

  const [studentSearchTerm, setStudentSearchTerm] = useState("")
  const studentSearchRef = useRef(null);

  const allSessions = useMemo(() => {
    const sessions = new Set();
    vouchers.forEach(v => {
      sessions.add(getCalendarYearBasedSessionFromDate(new Date(v.dueDate))); // Use dueDate for voucher session
    });
    students.forEach(s => {
      if (s.lastSession) sessions.add(s.lastSession);
    });
    return Array.from(sessions).sort((a, b) => b.localeCompare(a));
  }, [vouchers, students]);

  const searchResults = useMemo(() => {
    if (!studentSearchTerm.trim()) return [];
    const term = studentSearchTerm.toLowerCase();
    return students.filter(s =>
      s.regNumber?.toString().includes(term) ||
      s.rollNumber?.toString().includes(term) ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(term)
    ).slice(0, 6);
  }, [students, studentSearchTerm]);

  const handleSelectStudent = (student) => {
    setSelectedStudentId(student.id);
    setStudentSearchTerm("");
  };

  const filteredVouchers = useMemo(() => {
    let filtered = vouchers;

    if (selectedStudentId) {
      filtered = filtered.filter(v => v.studentId === selectedStudentId);
    } else if (selectedClass && selectedClass !== "all") {
      const studentIdsInClass = students.filter(s => s.class === selectedClass).map(s => s.id);
      filtered = filtered.filter(v => studentIdsInClass.includes(v.studentId));
    }

    if (selectedSession && selectedSession !== "all") {
      filtered = filtered.filter(v => getCalendarYearBasedSessionFromDate(new Date(v.dueDate)) === selectedSession); // Use dueDate for voucher session
    }

    if (dateFrom || dateTo) {
      filtered = filtered.filter(v => withinDateRange(v.createdAt, dateFrom, dateTo));
    }

    return filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Oldest first, newest at bottom
  }, [vouchers, selectedStudentId, selectedSession, dateFrom, dateTo, selectedClass, students]);

  const ledgerData = useMemo(() => {
    return filteredVouchers.map((v) => {
      const student = students.find((s) => s.id === v.studentId);
      const paymentDate = v.status !== "UNPAID" && v.updatedAt ? new Date(v.updatedAt) : null;

      return {
        date: new Date(v.createdAt).toLocaleDateString(),
        student: student ? `${student.firstName} ${student.lastName}` : "Unknown",
        type: `${v.month} Fee`,
        totalPayable: (v.totalPayable || 0).toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }),
        paidAmount: (v.paidAmount || 0).toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }),
        status: v.status || "UNPAID",
        paymentDate: paymentDate ? paymentDate.toLocaleDateString() : "N/A",
        paymentStatus: getPaymentStatus(paymentDate, v.dueDate),
        paymentMethod: v.paymentMethod || null,
        voucherNumber: v.voucherNumber
      };
    });
  }, [filteredVouchers, students]);

  const sessionStats = useMemo(() => {
    const generatedRevenue = filteredVouchers.reduce((acc, v) => acc + (v.status !== "UNPAID" ? Number(v.paidAmount || 0) : 0), 0);
    const targetedRevenue = filteredVouchers.reduce((acc, v) => acc + Number(v.amount || 0), 0); // 'amount' is the base monthly fee
    const collectionRate = targetedRevenue > 0 ? ((generatedRevenue / targetedRevenue) * 100).toFixed(2) : 0;

    let classTargetedRevenue = 0;
    if (selectedClass && selectedClass !== "all" && selectedSession && selectedSession !== "all") {
      const studentsInSelectedClass = students.filter(s => s.class === selectedClass);
      const feeStructure = structures.find(s => s.className === selectedClass);
      if (feeStructure) {
        const baseFee = (feeStructure.tuition || 0) + (feeStructure.exam || 0) + (feeStructure.transport || 0) + (feeStructure.fees?.reduce((sum, f) => sum + f.amount, 0) || 0);
        classTargetedRevenue = studentsInSelectedClass.length * baseFee; // Assuming monthly fee for all students in class
      }
    }

    return {
      generatedRevenue: generatedRevenue.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }),
      targetedRevenue: targetedRevenue.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }),
      collectionRate: `${collectionRate}%`,
      classTargetedRevenue: classTargetedRevenue.toLocaleString('en-PK', { style: 'currency', currency: 'PKR' }),
    };
  }, [filteredVouchers, selectedClass, selectedSession, students, structures]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(ledgerData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = ledgerData.slice(startIndex, startIndex + pageSize);

  useEffect(() => setCurrentPage(1), [dateFrom, dateTo, selectedStudentId, selectedSession, selectedClass]);

  const columns = [
    { 
      header: "Date", 
      accessor: "date",
      render: (row) => <span className="text-slate-500 font-medium">{row.date}</span>
    },
    {
      header: "Voucher #",
      accessor: "voucherNumber",
      render: (row) => <span className="font-mono font-bold text-blue-600">{row.voucherNumber}</span>
    },
    { 
      header: "Student", 
      accessor: "student",
      render: (row) => <span className="font-bold text-slate-800">{row.student}</span>
    },
    { header: "Type", accessor: "type" },
    { 
      header: "Total Payable", 
      accessor: "totalPayable",
      render: (row) => <span className="font-mono font-bold text-slate-900">{row.totalPayable}</span>
    },
    {
      header: "Paid Amount",
      accessor: "paidAmount",
      render: (row) => <span className="font-mono font-bold text-emerald-600">{row.paidAmount}</span>
    },
    {
      header: "Method",
      accessor: "paymentMethod",
      render: (row) => row.paymentMethod
        ? <span className="capitalize font-bold text-slate-700">{row.paymentMethod}</span>
        : <span className="text-slate-300 font-medium">—</span>
    },
    {
      header: "Payment Date",
      accessor: "paymentDate",
      render: (row) => <span className="text-slate-500 font-medium">{row.paymentDate}</span>
    },
    {
      header: "Payment Status",
      accessor: "paymentStatus",
      render: (row) => (
        <Badge
          className={cn(
            "rounded-lg px-2 py-0.5 uppercase text-[9px] font-black tracking-wider",
            row.paymentStatus === "On Time" ? "bg-emerald-100 text-emerald-700" :
            row.paymentStatus === "Late" ? "bg-red-100 text-red-700" :
            "bg-slate-100 text-slate-500"
          )}
        >
          {row.paymentStatus}
        </Badge>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <Badge 
          className="rounded-lg px-3 py-1 uppercase text-[10px] font-black tracking-wider"
          variant={row.status === "PAID" ? "success" : row.status === "PARTIAL" ? "warning" : "destructive"}
        >
          {row.status}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
          <div className="h-1 bg-blue-600 w-full" />
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Generated Revenue (Session)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-black text-blue-700">{sessionStats.generatedRevenue}</div>
          </CardContent>
        </Card>
        <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
          <div className="h-1 bg-emerald-600 w-full" />
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Targeted Revenue (Session)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-black text-emerald-700">{sessionStats.targetedRevenue}</div>
          </CardContent>
        </Card>
        <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
          <div className="h-1 bg-amber-500 w-full" />
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Collection Rate (Session)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-black text-amber-600">{sessionStats.collectionRate}</div>
          </CardContent>
        </Card>
        {selectedClass && selectedClass !== "all" && (
          <Card className="border border-slate-100 shadow-sm bg-white rounded-3xl overflow-hidden">
            <div className="h-1 bg-purple-600 w-full" />
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{selectedClass} Targeted Revenue</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-black text-purple-700">{sessionStats.classTargetedRevenue}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Student Ledger Details</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Filter By:</span>
            <div className="relative group w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <Input
                ref={studentSearchRef}
                placeholder="Search Student..."
                className="pl-10 h-9 bg-white border-slate-200 focus:bg-white transition-all rounded-lg text-xs font-bold"
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
              />
              {searchResults.length > 0 && studentSearchTerm.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 overflow-hidden max-h-64 overflow-y-auto">
                  {searchResults.map((s) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex justify-between items-center transition-colors border-b last:border-0 border-slate-100 text-xs"
                      onClick={() => handleSelectStudent(s)}
                    >
                      <span className="font-bold text-slate-700">{s.firstName} {s.lastName}</span>
                      <span className="text-[10px] text-slate-400">Roll: {s.rollNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedStudentId && (
              <Button variant="ghost" size="icon" onClick={() => setSelectedStudentId(null)} className="h-8 w-8 text-red-500 hover:bg-red-50">
                <X className="h-4 w-4" />
              </Button>
            )}
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger className="h-9 px-3 rounded-lg text-sm w-[120px] bg-white">
                <SelectValue placeholder="Session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {allSessions.map(session => <SelectItem key={session} value={session}>{session}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DataTable columns={columns} data={paginatedData} />

        {/* Pagination */}
        <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-slate-50/50 gap-4 border-t">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-tight">
            Showing <span className="text-slate-900">{ledgerData.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, ledgerData.length)}</span> of <span className="text-slate-900">{ledgerData.length}</span> Results
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
  )
}