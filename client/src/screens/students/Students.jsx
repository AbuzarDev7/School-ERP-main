import { useEffect, useState, useMemo } from "react"
import jsPDF from "jspdf";
import DataTable from "@/components/shared/DataTable"
import StudentForm from "./StudentForm"
import { Button } from "@/components/ui/button"
import { useStudents } from "@/context/StudentContext"
import { useSettings } from "@/context/SettingsContext"
import { formatRegNumber, formatRollNumber } from "@/lib/formatStudentNumber"
import { useFeeStructures } from "@/context/FeeStructureContext"
import { toast } from "sonner"
import FileViewModal from "./FileViewModal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  FileText,
  User,
  Printer,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Search,
  Download, // Changed from Filter to Download for export button
  Plus,
  Trash2,
  Edit3,
  Loader2,
  IdCard
} from "lucide-react"
import { generateStudentPDF } from "./StudentPrint"

import { exportStudentsToPDF, exportStudentsToExcel } from "./StudentExport"; // Import export functions

// Module-scope cache of photo URLs already loaded by the browser. Survives unmount/remount
// of the Students screen, so navigating away and back doesn't re-decode/flicker images.
const photoCache = new Set();

function StudentPhoto({ url, alt }) {
  const [loaded, setLoaded] = useState(() => !!url && photoCache.has(url));

  useEffect(() => {
    if (!url || photoCache.has(url)) return;
    const img = new Image();
    img.src = url;
    img.onload = () => {
      photoCache.add(url);
      setLoaded(true);
    };
    img.onerror = () => setLoaded(false);
  }, [url]);

  if (!url) {
    return (
      <div className="bg-slate-100 w-full h-full flex items-center justify-center">
        <User className="h-5 w-5 text-slate-400" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn(
        "w-full h-full object-cover transition-opacity duration-150",
        loaded ? "opacity-100" : "opacity-0"
      )}
    />
  );
}

export default function Students() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(() => {
    try {
      const savedPageSize = localStorage.getItem("student_page_size");
      return savedPageSize ? Number(savedPageSize) : 10;
    } catch (error) {
      console.error("Failed to load page size from localStorage", error);
      return 10; // Fallback to default if localStorage is inaccessible
    }
  });
  const { students, loading, deleteStudent, updateStudent, addStudent } = useStudents()
  const { brand, settings } = useSettings()
  const [deleteId, setDeleteId] = useState(null)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState("INACTIVE")
  const { structures } = useFeeStructures()

  const classList = structures.map(s => s.className)
  const [selectedClass, setSelectedClass] = useState("all")
  const [previewFile, setPreviewFile] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ACTIVE")

  const statusOptions = [
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
    { label: "Graduated", value: "GRADUATED" },
    { label: "Withdrawn", value: "WITHDRAWN" },
    { label: "Discharged", value: "DISCHARGED" },
    { label: "Rusticated", value: "RUSTICATED" },
    { label: "Archived", value: "ARCHIVED" },
  ]

  const defaultVisibility = useMemo(() => ({
    "Picture": true, "Reg #": true, "Name": true, "Father Name": true, "Father CNIC": false,
    "Guardian": false, "Occupation": false, "Roll No": true, "Class": true, "Status": true,
    "DOB": false, "Admission Date": false, "Session": false, "Phone": true, "Emergency": true, "Prev School": false,
    "Address": true, "Actions": true,
  }), []);

  const [columnVisibility, setColumnVisibility] = useState(() => {
    const saved = localStorage.getItem("student_column_visibility");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure any new columns added to the code are present
        return { ...defaultVisibility, ...parsed };
      } catch (e) {
        return defaultVisibility;
      }
    }
    return defaultVisibility;
  });

  useEffect(() => {
    localStorage.setItem("student_column_visibility", JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  useEffect(() => {
    localStorage.setItem("student_page_size", pageSize.toString());
  }, [pageSize]);

  const BASE_URL = import.meta.env.VITE_API_URL || "";
  const getFileUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const clean = path.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${BASE_URL}/${clean}`;
  };

  // Optimized Filter Logic (Matching Original behavior)
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch =
        student.firstName?.toLowerCase().includes(searchStr) ||
        student.lastName?.toLowerCase().includes(searchStr) ||
        student.fathersName?.toLowerCase().includes(searchStr) || // Default sort: Oldest first (newest at bottom)
        student.rollNumber?.toString()?.includes(searchTerm) ||
        student.regNumber?.toString()?.includes(searchTerm);
      const matchesClass = selectedClass === "all" || student.class === selectedClass;
      const matchesStatus = statusFilter === "all" || student.status === statusFilter;
      return matchesSearch && matchesClass && matchesStatus;
    }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [students, searchTerm, selectedClass, statusFilter]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + pageSize);

  useEffect(() => setCurrentPage(1), [searchTerm, selectedClass]);

  // Function to export all admission forms in a single combined PDF
  const handleBulkAdmissionFormExport = async () => {
    if (filteredStudents.length === 0) {
      toast.info("No students to export.");
      return;
    }

    const generateSinglePDF = async () => {
      const combinedDoc = new jsPDF();
      let isFirst = true;
      for (const student of filteredStudents) {
        if (!isFirst) combinedDoc.addPage();
        // We pass combinedDoc as the second argument so generateStudentPDF doesn't trigger individual saves
        await generateStudentPDF({ ...student, photo: getFileUrl(student.photo) }, combinedDoc, brand);
        isFirst = false;
      }
      combinedDoc.save(`Admission_Forms_Combined_${new Date().getTime()}.pdf`);
    };

    toast.promise(generateSinglePDF(), {
      loading: `Generating single PDF for ${filteredStudents.length} students...`,
      success: `Successfully exported all forms into one PDF.`,
      error: "Failed to generate combined admission forms.",
    });
  };

  // Function to export admission forms as separate files if needed
  const handleSeparateAdmissionFormsExport = async () => {
    if (filteredStudents.length === 0) {
      toast.info("No students to export.");
      return;
    }

    const generateSeparate = async () => {
      const exportPromises = filteredStudents.map(async (student) => {
        await generateStudentPDF({ ...student, photo: getFileUrl(student.photo) }, null, brand);
      });
      return Promise.all(exportPromises);
    };

    toast.promise(generateSeparate(), {
      loading: `Exporting ${filteredStudents.length} separate files...`,
      success: `Successfully exported ${filteredStudents.length} individual PDFs.`,
      error: "Failed to export separate forms.",
    });
  };

  const confirmDelete = () => {
    setIsDeleting(true);
    const savePromise = deleteStudent(deleteId, deleteStatus);

    toast.promise(savePromise, {
      loading: "Updating status...",
      success: () => {
        setIsDeleting(false);
        setIsDeleteAlertOpen(false);
        return "Student status updated successfully";
      },
      error: () => {
        setIsDeleting(false);
        return "Failed to update status";
      }
    });
  }

  // Define Columns (Restored Accessors for DataTable sorting)
  const columns = [
    {
      header: "Picture",
      render: (row) => {
        const url = getFileUrl(row.photo);
        return (
          <div className="w-25 h-25 rounded-sm overflow-hidden bg-slate-50 flex items-center justify-center border border-slate-100">
            <StudentPhoto url={url} alt={row.firstName} />
          </div>
        );
      }
    },
    { header: "Reg #", accessor: "regNumber", render: (row) => formatRegNumber(row.regNumber, settings) },
    { header: "Roll No", accessor: "rollNumber", render: (row) => formatRollNumber(row.rollNumber, settings) },
    {
      header: "Name",
      accessor: "firstName", // Points to firstName for sorting
      render: (row) => <span className="font-bold text-slate-700">{row.firstName} {row.lastName}</span>
    },
    { header: "Father Name", accessor: "fathersName" },
    { header: "Father CNIC", accessor: "fathersCnic" },
    { header: "Guardian", accessor: "guardianName" },
    { header: "Phone", accessor: "phone" },
    { header: "Emergency", accessor: "emergencyNumber" },
    { header: "Occupation", accessor: "guardianOccupation" },
    { header: "Class", accessor: "class" },
    {
      header: "Status",
      accessor: "status",
      render: (row) => {
        const statusConfig = {
          ACTIVE: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", info: "Currently enrolled and participating" },
          INACTIVE: { cls: "bg-slate-100 text-slate-600 border-slate-200", info: "Temporarily not active (leave, gap, etc.)" },
          GRADUATED: { cls: "bg-blue-100 text-blue-700 border-blue-200", info: "Completed program" },
          WITHDRAWN: { cls: "bg-amber-100 text-amber-700 border-amber-200", info: "Left voluntarily" },
          DISCHARGED: { cls: "bg-orange-100 text-orange-700 border-orange-200", info: "Removed by institution (non-disciplinary)" },
          RUSTICATED: { cls: "bg-rose-100 text-rose-700 border-rose-200", info: "Suspended/expelled due to disciplinary reasons" },
          ARCHIVED: { cls: "bg-zinc-100 text-zinc-600 border-zinc-200", info: "No longer in active use but kept for records" },
        };
        const config = statusConfig[row.status] || statusConfig.ARCHIVED;
        return (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border cursor-help shadow-sm transition-all active:scale-95",
                  config.cls
                )}>{row.status}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-slate-900 text-white border-slate-800 rounded-xl px-3 py-1.5 shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] mb-0.5">{row.status}</p>
                <p className="text-xs text-slate-400 font-medium">{config.info}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
    },
    {
      header: "DOB",
      accessor: "dob",
      render: (row) => row.dob ? new Date(row.dob).toLocaleDateString() : "—"
    },
    {
      header: "Admission Date",
      accessor: "admissionDate",
      render: (row) => row.admissionDate ? new Date(row.admissionDate).toLocaleDateString() : "—"
    },
    { header: "Session", accessor: "lastSession" },

    { header: "Prev School", accessor: "previousSchool" },
    { header: "Address", accessor: "address" },
    {
      header: "Actions",
      sticky: true,
      render: (row) => {
        const docs = [
          { key: 'photo', icon: <User className="h-4 w-4" />, label: 'Photo' },
          { key: 'birthCertificate', icon: <FileText className="h-4 w-4" />, label: 'B-Form' },
          { key: 'fatherCnicFile', icon: <IdCard className="h-4 w-4" />, label: 'CNIC' },
          { key: 'leavingCertificate', icon: <FileText className="h-4 w-4" />, label: 'SLC' },
        ];

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 sm:px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider border-slate-200 hover:bg-slate-50 transition-all gap-1.5 shadow-sm"
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden sm:inline">
                  View Details
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" sideOffset={5} avoidCollisions={false} className="w-60 p-2 rounded-2xl shadow-xl border-slate-100">
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Documentation</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => generateStudentPDF({ ...row, photo: getFileUrl(row.photo) }, null, brand)} className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                <Printer className="mr-2 h-4 w-4 text-blue-600" /> Admission Form
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                <Printer className="mr-2 h-4 w-4 text-blue-600" /> Leaving Certificate
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                <Printer className="mr-2 h-4 w-4 text-blue-600" /> Character Certificate
              </DropdownMenuItem>
              {docs.map((doc) => (
                <DropdownMenuItem
                  key={doc.key}
                  onClick={() => {
                    if (row[doc.key]) {
                      setPreviewFile({ url: getFileUrl(row[doc.key]), name: doc.label });
                    } else {
                      toast.error(`No ${doc.label} uploaded. Edit the student to add it.`);
                    }
                  }}
                  className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className={`mr-2 ${row[doc.key] ? 'text-emerald-600' : 'text-slate-300'}`}>{doc.icon}</div>
                  View {doc.label}
                  {!row[doc.key] && <span className="ml-auto text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Not uploaded</span>}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Management</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => { setEditing(row); setOpen(true); }} className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors">
                <Edit3 className="mr-2 h-4 w-4 text-blue-600" /> Edit Student Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setDeleteId(row.id); setIsDeleteAlertOpen(true); }} className="flex items-center h-10 px-3 rounded-xl font-bold text-red-600 cursor-pointer hover:bg-red-50 transition-colors">
                <Trash2 className="mr-2 h-4 w-4 text-red-500" /> Delete Student Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    },
  ];

  const visibleColumns = columns.filter(col => columnVisibility[col.header]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Student Directory</h2>
          <p className="text-sm text-slate-500 font-medium">Manage student registrations and academic records</p>
        </div>
        <Button onClick={() => setOpen(true)} className="h-11 p-0 rounded-xl font-bold border-2 border-emerald-600 bg-transparent hover:bg-transparent shadow-lg shadow-emerald-900/20 transition-all overflow-hidden group">
          <div className="flex items-center justify-center w-full h-full bg-emerald-600 px-6 animate-fast-blink text-white transition-colors group-hover:animate-none group-hover:bg-emerald-700">
            <Plus className="mr-2 h-5 w-5" /> Register New Student
          </div>
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        {/* Row: Search, Column Toggle, and Export - Always side-by-side */}
        <div className="flex flex-row gap-3 items-center w-full lg:flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Search by name, registration, or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 bg-white border-none rounded-2xl shadow-sm text-base"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-12 bg-white rounded-2xl shadow-sm border-none hover:bg-slate-50 flex items-center justify-center">
                  <MoreHorizontal className="h-6 w-6 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" sideOffset={5} avoidCollisions={false} className="w-56">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); setColumnVisibility(Object.fromEntries(columns.map(c => [c.header, true]))); }}
                  className="flex items-center h-10 px-3 rounded-xl font-bold text-blue-600 cursor-pointer hover:bg-blue-50 transition-colors text-[10px] uppercase tracking-widest"
                >
                  Select All
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); setColumnVisibility(defaultVisibility); }}
                  className="flex items-center h-10 px-3 rounded-xl font-bold text-rose-600 cursor-pointer hover:bg-rose-50 transition-colors text-[10px] uppercase tracking-widest"
                >
                  Reset to Defaults
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {columns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.header}
                    checked={columnVisibility[col.header]}
                    onCheckedChange={(val) => setColumnVisibility(p => ({ ...p, [col.header]: !!val }))}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {col.header}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-8 px-4 sm:px-6 rounded-2xl font-bold gap-2 border-none bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center">
                  <Download className="w-5 h-5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" sideOffset={5} avoidCollisions={false} className="w-48 p-2 rounded-2xl shadow-xl border-slate-100">
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Export Student List</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => exportStudentsToPDF(filteredStudents, visibleColumns, selectedClass, statusFilter, brand)}
                  className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <FileText className="mr-2 h-4 w-4 text-red-600" /> Export to PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportStudentsToExcel(filteredStudents, visibleColumns, selectedClass, statusFilter)}
                  className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <FileText className="mr-2 h-4 w-4 text-green-600" /> Export to Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleBulkAdmissionFormExport}
                  className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <FileText className="mr-2 h-4 w-4 text-blue-600" /> Admission Forms (Single PDF)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSeparateAdmissionFormsExport}
                  className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <Printer className="mr-2 h-4 w-4 text-blue-400" /> Admission Forms (Separate PDFs)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-row gap-3 w-full lg:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-14 flex-1 lg:w-40 bg-white border-none rounded-2xl shadow-sm font-bold text-slate-600">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent side="bottom" position="popper" sideOffset={4}>
              <SelectItem value="all">All Status</SelectItem>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="h-14 bg-white border-none rounded-2xl shadow-sm font-bold text-slate-600">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent side="bottom" position="popper" sideOffset={4}>
              <SelectItem value="all">All Classes</SelectItem>
              {classList.map((cls) => (
                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 font-bold">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <DataTable columns={visibleColumns} data={paginatedStudents} />
            </div>

            {/* Pagination */}
            <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-slate-50/50 gap-4">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-tight">
                Showing <span className="text-slate-900">{filteredStudents.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, filteredStudents.length)}</span> of <span className="text-slate-900">{filteredStudents.length}</span> Results
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Rows:</span>
                  <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
                    <SelectTrigger className="w-16 h-8 rounded-lg bg-white shadow-sm font-bold text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="bottom" position="popper" sideOffset={4}>
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
          </>
        )}
      </div>

      {/* Confirmation & Form Modals same as original... */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="max-w-md rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black">Change Student Status</AlertDialogTitle>
            <AlertDialogDescription className="pt-4 text-slate-500 font-medium leading-relaxed">
              You are modifying the administrative status for this student. This transition archives their active enrollment while ensuring academic and financial history remains preserved for institutional records.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Reason / Method</Label>
            <Select value={deleteStatus} onValueChange={setDeleteStatus}>
              <SelectTrigger className="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold h-11 px-6 shadow-lg shadow-blue-600/20"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Update Status"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StudentForm
        open={open}
        setOpen={(isOpen) => { setOpen(isOpen); if (!isOpen) setEditing(null); }}
        initialData={editing}
        classList={classList}
        onSave={async (formDataPayload) => {
          const savePromise = editing ? updateStudent(editing.id, formDataPayload) : addStudent(formDataPayload);

          toast.promise(savePromise, {
            loading: "Saving...",
            success: () => { setOpen(false); setEditing(null); return "Saved"; },
            error: "Error",
          });

          return savePromise; // Return the promise to allow the form to await it
        }}
      />

      <FileViewModal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} fileUrl={previewFile?.url} fileName={previewFile?.name} />
    </div>
  )
}