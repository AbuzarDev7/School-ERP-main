import { useState, useMemo } from "react"
import DataTable from "@/components/shared/DataTable"
import ProductForm from "./ProductForm"
import { Button } from "@/components/ui/button"
import { useProducts } from "@/context/ProductContext"
import { toast } from "sonner"
import { Package, Plus, Search, Edit3, Trash2, ShoppingBag, Layers, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


export default function Products() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const { products = [], loading = false, addProduct, updateProduct, deleteProduct } = useProducts()
  const [deleteId, setDeleteId] = useState(null)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredProducts = useMemo(() => {
    return (products || []).filter(p => 
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.productNumber).includes(searchTerm) ||
      (p.sku && String(p.sku).includes(searchTerm)) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Oldest first, newest at bottom
  }, [products, searchTerm]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  const columns = useMemo(() => [
    { 
      header: "ID",
      render: (row) => <span className="font-mono text-slate-500">{row.productNumber ? `#${row.productNumber}` : 'N/A'}</span>
    },
    { 
      header: "Product Name", 
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="font-semibold text-slate-700">{row.productName}</span>
        </div>
      )
    },
    { 
      header: "Category", 
      render: (row) => (
        <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-md text-[10px] font-bold uppercase tracking-wider">
          {row.category || 'Uncategorized'}
        </span>
      )
    },
    { 
      header: "Stock", 
      render: (row) => (
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span className={row.stockQuantity < 20 ? 'text-red-500 font-bold' : 'text-slate-600'}>
            {row.stockQuantity.toLocaleString()} Units
          </span>
        </div>
      )
    },
    { 
      header: "Price", 
      render: (row) => (
        <div className="flex items-center text-slate-700 font-bold">
          <span className="pr-1 font-mono text-blue-600">Rs. </span>
          {Number(row.unitPrice).toLocaleString()}
        </div>
      )
    },
    {
      header: "Actions",
      render: (row) => (
        <div className="flex gap-1">
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
  ], [setEditing, setOpen, setDeleteId, setIsDeleteAlertOpen]);

  const handleSave = (data) => {
    const promise = editing ? updateProduct(editing.id, data) : addProduct(data);
    toast.promise(promise, {
      loading: editing ? 'Updating item...' : 'Adding to inventory...',
      success: () => { 
        setOpen(false); 
        setEditing(null); 
        return editing ? 'Product updated' : 'Product added'; 
      },
      error: (err) => err.response?.data?.error || 'Operation failed'
    });
  }

  if (loading) return <div className="p-12 text-center text-slate-400">Loading inventory...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Inventory Registry</h2>
          <p className="text-sm text-slate-500 font-medium">Manage school supplies, uniforms, and academic materials</p>
        </div>
        {/* <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]">
          <Plus className="w-5 h-5 mr-2" /> Add Item
        </Button> */}

        <Button onClick={() => setOpen(true)} className="h-11 p-0 rounded-xl font-bold border-2 border-emerald-600 bg-transparent hover:bg-transparent shadow-lg shadow-emerald-900/20 transition-all overflow-hidden group">
          <div className="flex items-center justify-center w-full h-full bg-emerald-600 px-6 animate-fast-blink text-white transition-colors group-hover:animate-none group-hover:bg-emerald-700">
            <Plus className="mr-2 h-5 w-5" /> Add Item
          </div>
        </Button>
      </div>

      {/* Search Filter */}
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Search by name, SKU, or category..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="pl-12 h-14 bg-white border-none rounded-2xl shadow-sm text-base" 
        />
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable columns={columns} data={paginatedProducts} />
        </div>

        {/* Pagination */}
        <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-slate-50/50 gap-4">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-tight">
            Showing <span className="text-slate-900">{filteredProducts.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, filteredProducts.length)}</span> of <span className="text-slate-900">{filteredProducts.length}</span> Results
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400">Rows:</span>
              <Select value={pageSize.toString()} onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1); // Reset to first page on page size change
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

      <ProductForm open={open} setOpen={(val) => { setOpen(val); if(!val) setEditing(null); }} onSave={handleSave} initialData={editing} />
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-slate-900">Remove from Inventory?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this product? This action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                toast.promise(deleteProduct(deleteId), {
                  loading: 'Deleting...',
                  success: () => { setIsDeleteAlertOpen(false); return 'Item removed'; },
                  error: 'Failed to delete'
                });
              }} 
              className="bg-red-600 hover:bg-red-700 rounded-xl font-bold"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}