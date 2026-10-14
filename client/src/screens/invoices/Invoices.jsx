import { useState, useMemo, useEffect } from "react"
import DataTable from "@/components/shared/DataTable"
import InvoiceForm from "./InvoiceForm"
import InvoicePrinter, { generateInvoicePDF } from "./InvoicePrinter"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useStudents } from "@/context/StudentContext"
import { useProducts } from "@/context/ProductContext"
import { useInvoices } from "@/context/InvoiceContext" // Import useInvoices
import { useSettings } from "@/context/SettingsContext"
import { usePaymentMethods } from "@/context/PaymentMethodContext"
import { Receipt, Plus, Edit3, Trash2, Calendar, User, Search, IndianRupee, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function Invoices() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const { invoices = [], loading = false, addInvoice, updateInvoice, deleteInvoice } = useInvoices()
  const { brand } = useSettings()
  const { students } = useStudents()
  const { products, fetchProducts } = useProducts()
  const { refresh: refreshPaymentMethods } = usePaymentMethods()
  
  const [deleteId, setDeleteId] = useState(null)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredInvoices = useMemo(() => {
    return (invoices || []).filter(inv => 
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Oldest first, newest at bottom
  }, [invoices, searchTerm]);

  const totalPages = Math.ceil(filteredInvoices.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + pageSize);

  useEffect(() => setCurrentPage(1), [searchTerm]);

  const columns = [
    { 
      header: "Invoice #", 
      render: (row) => (
        <span className="font-mono font-bold text-blue-600">{row.invoiceNumber}</span>
      )
    },
    { 
      header: "Date", 
      render: (row) => (
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(row.invoiceDate).toLocaleDateString()}
        </div>
      )
    },
    { 
      header: "Student",
      render: (row) => {
        const student = students.find(s => s.id === row.studentId)
        return (
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <User className="w-3.5 h-3.5 text-slate-400" />
            {student ? `${student.firstName} ${student.lastName}` : 'Unknown'}
          </div>
        )
      }
    },
    {
      header: "Grand Total",
      render: (row) => (
        <div className="flex items-center font-bold">
          <span className="font-mono text-blue-600 mr-1">Rs.</span>
          {Number(row.grandTotal).toLocaleString()}
        </div>
      )
    },
    {
      header: "Method",
      render: (row) => (
        row.paymentMethod
          ? <span className="text-xs font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">{row.paymentMethod}</span>
          : <span className="text-xs text-slate-400 italic">—</span>
      )
    },
    {
      header: "Actions",
      render: (row) => (
        <div className="flex gap-1">
          <InvoicePrinter 
            invoice={row} 
            student={students.find(s => s.id === row.studentId)} 
            products={products} 
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600"
            onClick={() => { setEditing(row); setOpen(true); }}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600"
            onClick={() => { setDeleteId(row.id); setIsDeleteAlertOpen(true); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const handleSave = async (data) => {
    const isEdit = !!editing;
    const promise = isEdit ? updateInvoice(editing.id, data) : addInvoice(data);
    toast.promise(promise, {
      loading: isEdit ? 'Updating invoice...' : 'Finalizing sale...',
      success: (saved) => {
        fetchProducts(); // Refresh stock quantities in global state
        refreshPaymentMethods(); // Refresh payment method balances
        setOpen(false);
        setEditing(null);

        // Auto-print the invoice as soon as it's saved.
        // Use the saved record (has the backend-assigned invoiceNumber) when available.
        const invoiceForPrint = saved || data;
        generateInvoicePDF({
          invoice: invoiceForPrint,
          student: students.find(s => s.id === invoiceForPrint.studentId),
          products,
          brand,
        });

        return isEdit
          ? 'Invoice updated — printing...'
          : `Sale recorded — Rs ${Math.round(data.grandTotal || 0).toLocaleString("en-PK")} added to ${data.paymentMethod}`;
      },
      error: (err) => err.response?.data?.error || 'Operation failed'
    });
  }

  if (loading) return <div className="p-12 text-center text-slate-400">Loading sales...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Invoices & Sales</h2>
          <p className="text-sm text-slate-500 font-medium">Track item sales, uniforms, and inventory billing</p>
        </div>
        {/* <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]">
          <Plus className="w-5 h-5 mr-2" /> New Sale
        </Button> */}

        <Button onClick={() => setOpen(true)} className="h-11 p-0 rounded-xl font-bold border-2 border-emerald-600 bg-transparent hover:bg-transparent shadow-lg shadow-emerald-900/20 transition-all overflow-hidden group">
          <div className="flex items-center justify-center w-full h-full bg-emerald-600 px-6 animate-fast-blink text-white transition-colors group-hover:animate-none group-hover:bg-emerald-700">
            <Plus className="mr-2 h-5 w-5" /> New Sale
          </div>
        </Button>
      </div>

      {/* Search Filter */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Search by Invoice Number (#INV-0001)..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="pl-12 h-14 bg-white border-none rounded-2xl shadow-sm text-base" 
        />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <DataTable columns={columns} data={paginatedInvoices} />

        {/* Pagination UI - Aligned with Student Management Pattern */}
        <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-slate-50/50 gap-4 border-t">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-tight">
            Showing <span className="text-slate-900">{filteredInvoices.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, filteredInvoices.length)}</span> of <span className="text-slate-900">{filteredInvoices.length}</span> Results
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

      <InvoiceForm open={open} setOpen={(val) => { setOpen(val); if(!val) setEditing(null); }} onSave={handleSave} initialData={editing} />
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-slate-900">Void Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this invoice? This will restore the stock quantities of all included items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                toast.promise(deleteInvoice(deleteId), {
                  loading: 'Voiding invoice...',
                  success: () => {
                    fetchProducts();
                    refreshPaymentMethods();
                    setIsDeleteAlertOpen(false);
                    return 'Invoice deleted';
                  },
                  error: 'Failed to delete'
                });
              }}
              className="bg-red-600 hover:bg-red-700 rounded-xl font-bold"
            >
              Confirm Void
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}