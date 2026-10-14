import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Search, Receipt, Edit3, Trash2, FileDown, FileSpreadsheet, Download } from "lucide-react"
import DataTable from "@/components/shared/DataTable"
import FeeStructureForm from "./FeeStructureForm" // Ensure this name matches your file
import FeeHeadForm from "./FeeHeadForm"
import { toast } from "sonner"
import { useFeeStructures } from "@/context/FeeStructureContext"
import { Input } from "@/components/ui/input"
import { feeHeadClient } from "@/services/feeHeadService"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { exportFeesToPDF, exportFeesToExcel } from "./FeeExport"
import { useSettings } from "@/context/SettingsContext"

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function FeeStructure() {
  const { structures, heads, loading: initialLoading, addStructure, updateStructure, deleteStructure, refreshStructures } = useFeeStructures()
  const { brand } = useSettings()
  const [loading, setLoading] = useState(false) // For form submission state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingData, setEditingData] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isHeadFormOpen, setIsHeadFormOpen] = useState(false)
  const [loadingHead, setLoadingHead] = useState(false)
  const [headToEdit, setHeadToEdit] = useState(null)

  const [deleteHeadId, setDeleteHeadId] = useState(null)
  const [isDeleteHeadAlertOpen, setIsDeleteHeadAlertOpen] = useState(false)

  // Memoized filter and sort logic to match Students.jsx behavior
  const filteredStructures = useMemo(() => {
    return [...structures]
      .filter(s =>
        s.className.toLowerCase().includes(searchTerm.toLowerCase())
      ) // Oldest first, newest at bottom
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : 0;
        const dateB = b.createdAt ? new Date(b.createdAt) : 0;
        return dateA - dateB;
      });
  }, [structures, searchTerm]);

  const columns = useMemo(() => [
    { 
      header: "Class", 
      accessor: "className",
      render: (row) => <span className="font-bold text-slate-700">{row.className}</span> 
    },
    {
      header: "Tuition",
      render: (row) => `Rs. ${(row.tuition || 0).toLocaleString()}`
    },
    {
      header: "Exam",
      render: (row) => `Rs. ${(row.exam || 0).toLocaleString()}`
    },
    {
      header: "Transport",
      render: (row) => `Rs. ${(row.transport || 0).toLocaleString()}`
    },
    {
      header: "School Fee",
      render: (row) => `Rs. ${(row.schoolFee || 0).toLocaleString()}`
    },
    {
      header: "Admission Fee",
      render: (row) => `Rs. ${(row.admissionFee || 0).toLocaleString()}`
    },
    {
      header: "Annual Fund",
      render: (row) => `Rs. ${(row.annualFund || 0).toLocaleString()}`
    },
    {
      header: "Course Fee",
      render: (row) => `Rs. ${(row.courseFee || 0).toLocaleString()}`
    },
    {
      header: "Late Fee Fine",
      render: (row) => <span className="text-amber-600 font-medium">Rs. {(row.late || 0).toLocaleString()}</span>
    },
    ...heads
      .filter(h => !["tuition", "exam", "transport"].includes(h.name.toLowerCase()))
      .map(head => ({
        header: head.name,
        render: (row) => {
          const feeItem = row.fees?.find(f => f.feeHeadId === head.id);
          return `Rs. ${(feeItem?.amount || 0).toLocaleString()}`;
        }
      })),
    {
      header: "Total Amount",
      render: (row) => {
        const total = (row.tuition || 0) + (row.exam || 0) + (row.transport || 0) +
          (row.schoolFee || 0) + (row.admissionFee || 0) + (row.annualFund || 0) + (row.courseFee || 0) +
          (row.fees?.reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0);
        return <span className="font-bold text-slate-800">Rs. {total.toLocaleString()}</span>;
      }
    },
    {
      header: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <Button
            variant="ghost" 
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-blue-600"
            onClick={() => {
              setEditingData(row)
              setIsFormOpen(true)
            }} >
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-600"
            onClick={() => {
              setDeleteId(row.id)
              setIsDeleteAlertOpen(true)
            }} >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [heads])

  const handleSave = async (formData) => {
    setLoading(true)
    const savePromise = editingData 
      ? updateStructure(editingData.id, formData)
      : addStructure(formData);

    toast.promise(savePromise, {
      loading: editingData ? "Updating structure..." : "Creating structure...",
      success: () => {
        setLoading(false)
        setIsFormOpen(false)
        setEditingData(null)
        return editingData ? "Structure updated successfully" : "Structure created successfully"
      },
      error: (err) => {
        setLoading(false)
        return err.response?.data?.error || "Failed to save structure"
      }
    })
  }

  const handleHeadSave = async (formData) => {
    setLoadingHead(true)
    try {
      if (headToEdit) {
        await feeHeadClient.update(headToEdit.id, formData)
        toast.success("Fee Head updated")
      } else {
        await feeHeadClient.create(formData)
        toast.success("New Fee Head created")
      }
      await refreshStructures() // Re-fetch to update table columns and heads
      setIsHeadFormOpen(false)
      setHeadToEdit(null)
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.error || "Failed to create fee head")
    } finally {
      setLoadingHead(false)
    }
  }

  const confirmDelete = async () => {
    const structure = structures.find(s => s.id === deleteId)

    toast.promise(deleteStructure(deleteId), {
      loading: `Deleting structure for ${structure?.className}...`,
      success: () => "Structure deleted",
      error: (err) => err.response?.data?.error || "Error deleting",
    })

    setIsDeleteAlertOpen(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header - Styled to match Students.jsx */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Class-wise Fees</h2>
          <p className="text-sm text-slate-500 font-medium">Manage and define fee structures for each grade</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setHeadToEdit(null)
              setIsHeadFormOpen(true)
            }}
            className="h-11 px-6 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Fee Head
          </Button>
          {/* <Button onClick={() => {
            setEditingData(null)
            setIsFormOpen(true)
          }} className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]">
          <Plus className="mr-2 h-4 w-4" /> Add Fee Structure
        </Button> */}
        <Button 
          onClick={() => {
            setEditingData(null)
            setIsFormOpen(true)
          }} className="h-11 p-0 rounded-xl font-bold border-2 border-emerald-600 bg-transparent hover:bg-transparent shadow-lg shadow-emerald-900/20 transition-all overflow-hidden group">
                  <div className="flex items-center justify-center w-full h-full bg-emerald-600 px-6 animate-fast-blink text-white transition-colors group-hover:animate-none group-hover:bg-emerald-700">
                    <Plus className="mr-2 h-5 w-5" /> Add Fee Structure
                  </div>
                </Button>
        </div>
      </div>

      {/* Fee Heads Registry Overview */}
      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/60">
        <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 block">Active Fee Heads Registry</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {heads
            .filter(h => !["Tuition", "Exam", "Transport"].includes(h.name))
            .map((head) => (
            <div key={head.id} className="group bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-700 text-sm leading-none mb-1">{head.name}</p>
                <p className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block">Rs. {head.amount.toLocaleString()}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setHeadToEdit(head); setIsHeadFormOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setDeleteHeadId(head.id); setIsDeleteHeadAlertOpen(true); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search Bar & Export - Styled to match Students.jsx pattern */}
      <div className="flex flex-row gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Search by class name..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-12 h-14 bg-white border-none rounded-2xl shadow-sm text-base" 
          />
        </div>

        <div className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-14 px-4 sm:px-6 rounded-2xl font-bold gap-2 border-none bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center">
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" sideOffset={5} avoidCollisions={false} className="w-48 p-2 rounded-2xl shadow-xl border-slate-100">
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Export Fee Structures</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => exportFeesToPDF(filteredStructures, columns, brand)} 
                className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <FileDown className="mr-2 h-4 w-4 text-red-600" /> Export to PDF
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => exportFeesToExcel(filteredStructures, columns)} 
                className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Export to Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <FeeStructureForm 
        open={isFormOpen}
        setOpen={(val) => {
          setIsFormOpen(val)
          if (!val) setEditingData(null)
        }}
        initialData={editingData}
        onSave={handleSave}
        loading={loading}
      />

      <FeeHeadForm 
        open={isHeadFormOpen}
        setOpen={(val) => {
          setIsHeadFormOpen(val)
          if (!val) setHeadToEdit(null)
        }}
        initialData={headToEdit}
        onSave={handleHeadSave}
        loading={loadingHead}
      />

      {/* Table Section - Styled to match Students.jsx */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        {initialLoading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 font-bold">
            Loading fee data...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={filteredStructures} />
          </div>
        )}
      </div>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the fee assignments for this class.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fee Head Specific Deletion */}
      <AlertDialog open={isDeleteHeadAlertOpen} onOpenChange={setIsDeleteHeadAlertOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold">Remove Fee Head?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category from the registry. Classes currently using this head will no longer show it in their structures.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                try {
                  await feeHeadClient.delete(deleteHeadId)
                  toast.success("Fee Head removed")
                  await refreshStructures()
                } catch (e) { toast.error("Failed to delete") }
              }}
              className="bg-red-600 hover:bg-red-700 rounded-xl font-bold"
            >
              Delete Head
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}