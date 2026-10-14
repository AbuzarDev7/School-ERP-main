import React, { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Calendar,
  Pencil,
  Trash2,
  Loader2,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Filter,
  Tag,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExpenses } from "@/context/ExpenseContext";
import { usePaymentMethods } from "@/context/PaymentMethodContext";
import AddExpenseModal from "./AddExpenseModal";
import AddHeadModal from "./AddHeadModal";

const formatCurrency = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
const formatDate = (d) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

export default function Expenses() {
  const {
    expenses,
    heads,
    activeHeads,
    archivedHeads,
    loading,
    addExpense,
    editExpense,
    removeExpense,
    addHead,
    editHead,
    archiveHead,
    unarchiveHead,
    removeHead,
  } = useExpenses();
  const { methods, refresh: refreshMethods } = usePaymentMethods();

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Expense-head manager state — surfaced via the Add Expense Head dropdown in
  // the page header. The form/archive/delete confirmations mount once at the
  // bottom of the component so they don't re-open the dropdown they came from.
  const [showAddHead, setShowAddHead] = useState(false);
  const [editingHead, setEditingHead] = useState(null);
  const [archivingHead, setArchivingHead] = useState(null);
  const [deletingHead, setDeletingHead] = useState(null);

  const [search, setSearch] = useState("");
  const [headFilter, setHeadFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return expenses.filter((e) => {
      if (headFilter !== "all" && e.headId !== headFilter) return false;
      if (methodFilter !== "all" && e.paymentMethod !== methodFilter) return false;
      if (!q) return true;
      const headName = (e.head?.name || "").toLowerCase();
      const detail = (e.detail || "").toLowerCase();
      return headName.includes(q) || detail.includes(q) || e.paymentMethod.toLowerCase().includes(q);
    });
  }, [expenses, search, headFilter, methodFilter]);

  const total = useMemo(() => filtered.reduce((s, e) => s + Number(e.amount || 0), 0), [filtered]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);

  const openAdd = () => {
    setEditing(null);
    setShowAdd(true);
  };

  const openEdit = (e) => {
    setEditing(e);
    setShowAdd(true);
  };

  const handleSave = async (data) => {
    if (editing) {
      await editExpense(editing.id, data);
    } else {
      await addExpense(data);
    }
    refreshMethods();
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await removeExpense(deleting.id);
      refreshMethods();
    } catch (_) { /* toast shown */ }
    setDeleting(null);
  };

  const openAddHead = () => {
    setEditingHead(null);
    setShowAddHead(true);
  };

  const openEditHead = (h) => {
    setEditingHead(h);
    setShowAddHead(true);
  };

  const handleSaveHead = async (data) => {
    if (editingHead) {
      await editHead(editingHead.id, data);
    } else {
      await addHead(data);
    }
    setEditingHead(null);
  };

  const confirmArchiveHead = async () => {
    if (archivingHead) await archiveHead(archivingHead.id);
    setArchivingHead(null);
  };

  const confirmDeleteHead = async () => {
    if (deletingHead) {
      try { await removeHead(deletingHead.id); } catch (_) { /* toast shown */ }
    }
    setDeletingHead(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Expenses</h2>
          <p className="text-slate-500 text-sm font-medium">Track outgoing spending against your payment methods</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-11 px-6 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98] w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Expense Head
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              sideOffset={6}
              avoidCollisions={false}
              className="w-80 p-2 rounded-2xl shadow-xl border-slate-100"
            >
              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">
                Expense Head Manager
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={openAddHead}
                className="flex items-center h-10 px-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <Plus className="mr-2 h-4 w-4 text-emerald-600" /> New Head
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2 flex items-center justify-between">
                <span>Active</span>
                <span className="text-slate-600 font-mono">{activeHeads.length}</span>
              </DropdownMenuLabel>

              {activeHeads.length === 0 ? (
                <div className="px-4 py-6 text-[10px] text-slate-400 italic text-center">
                  No active heads — add one above.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto py-1">
                  {activeHeads.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 mx-1 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-700 truncate">{h.name}</span>
                          {h.description && (
                            <span className="text-[10px] text-slate-400 font-medium truncate">{h.description}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditHead(h)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          aria-label={`Edit ${h.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setArchivingHead(h)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          aria-label={`Archive ${h.name}`}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingHead(h)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`Delete ${h.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {archivedHeads.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2 flex items-center justify-between">
                    <span>Archived</span>
                    <span className="text-slate-600 font-mono">{archivedHeads.length}</span>
                  </DropdownMenuLabel>
                  <div className="max-h-40 overflow-y-auto py-1">
                    {archivedHeads.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 mx-1 rounded-lg hover:bg-slate-50 transition-colors opacity-70"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Archive className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs font-bold text-slate-600 truncate">{h.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => unarchiveHead(h.id)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
                          aria-label={`Restore ${h.name}`}
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={openAdd} className="h-11 p-0 rounded-xl font-bold border-2 border-emerald-600 bg-transparent hover:bg-transparent shadow-lg shadow-emerald-900/20 transition-all overflow-hidden group w-full sm:w-auto">
            <div className="flex items-center justify-center w-full h-full bg-emerald-600 px-6 animate-fast-blink text-white transition-colors group-hover:animate-none group-hover:bg-emerald-700">
              <Plus className="mr-2 h-5 w-5" /> New Expense
            </div>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Total Records</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Total Amount</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{formatCurrency(total)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Active Heads</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{heads.filter((h) => !h.archived).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-55">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by head, detail, or method..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-10 bg-slate-50 border-slate-200 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={14} className="text-slate-400 shrink-0" />
          <Select value={headFilter} onValueChange={(v) => { setHeadFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 flex-1 sm:flex-none sm:w-44 rounded-xl bg-slate-50 border-slate-200 text-xs font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All heads</SelectItem>
              {heads.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(1); }}>
            <SelectTrigger className="h-10 flex-1 sm:flex-none sm:w-44 rounded-xl bg-slate-50 border-slate-200 text-xs font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              {methods.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={36} className="animate-spin opacity-30 mb-3" />
            <p className="font-bold text-sm">Loading expenses...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Receipt size={48} className="opacity-20 mb-3" />
            <p className="font-bold">No expenses recorded yet</p>
            <p className="text-xs font-medium mt-1">Click "New Expense" to record one.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-lg border-collapse">
                <thead className="bg-slate-100 border-b-2 border-slate-200">
                  <tr className="text-left">
                    <th className="px-6 py-4 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Date</th>
                    <th className="px-6 py-4 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Head</th>
                    <th className="px-6 py-4 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Detail</th>
                    <th className="px-6 py-4 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0">Method</th>
                    <th className="px-6 py-4 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0 text-right">Amount</th>
                    <th className="px-6 py-4 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200 last:border-r-0 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((e, i) => {
                    // Match DataTable's zebra stripe so rows in the hand-rolled
                    // expense list stay visually consistent with rest of app.
                    const rowBg = i % 2 === 0 ? "bg-white" : "bg-slate-50";
                    return (
                    <tr key={e.id} className={`${rowBg} border-b border-slate-200 hover:bg-slate-100 transition-colors`}>
                      <td className="px-6 py-4 border-r border-slate-200 last:border-r-0">
                        <div className="flex items-center gap-2 text-slate-500 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(e.date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 border-r border-slate-200 last:border-r-0">
                        <span className="font-bold text-slate-800">{e.head?.name || "—"}</span>
                      </td>
                      <td className="px-6 py-4 max-w-xs border-r border-slate-200 last:border-r-0">
                        <span className="text-slate-600 text-xs font-medium line-clamp-2">{e.detail || "—"}</span>
                      </td>
                      <td className="px-6 py-4 border-r border-slate-200 last:border-r-0">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-700 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">{e.paymentMethod}</span>
                      </td>
                      <td className="px-6 py-4 text-right border-r border-slate-200 last:border-r-0">
                        <span className="font-black text-emerald-700">{formatCurrency(e.amount)}</span>
                      </td>
                      <td className="px-6 py-4 text-right border-r border-slate-200 last:border-r-0">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(e)} className="h-8 w-8 text-slate-400 hover:text-blue-600">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleting(e)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-slate-50/50 gap-4 border-t">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-tight">
                Showing <span className="text-slate-900">{filtered.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, filtered.length)}</span> of <span className="text-slate-900">{filtered.length}</span> Results
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Rows:</span>
                  <Select value={pageSize.toString()} onValueChange={(val) => { setPageSize(Number(val)); setPage(1); }}>
                    <SelectTrigger className="w-16 h-8 rounded-lg bg-white shadow-sm font-bold text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 10, 20, 50].map((s) => <SelectItem key={s} value={s.toString()}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-10 w-10 bg-white shadow-sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center justify-center px-4 h-10 bg-emerald-700 rounded-xl text-white text-xs font-black">
                    {page} / {totalPages || 1}
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 bg-white shadow-sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <AddExpenseModal
        open={showAdd}
        setOpen={(v) => {
          setShowAdd(v);
          if (!v) setEditing(null);
        }}
        onSave={handleSave}
        initialData={editing}
        heads={heads}
        paymentMethods={methods}
      />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              The amount will be returned to <b>{deleting?.paymentMethod}</b>'s balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddHeadModal
        open={showAddHead}
        setOpen={(v) => {
          setShowAddHead(v);
          if (!v) setEditingHead(null);
        }}
        onSave={handleSaveHead}
        initialData={editingHead}
      />

      <AlertDialog open={!!archivingHead} onOpenChange={(v) => !v && setArchivingHead(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {archivingHead?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Archiving hides this head from the expense form, but keeps existing records intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchiveHead}
              className="bg-rose-700 hover:bg-rose-800 rounded-xl font-bold"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingHead} onOpenChange={(v) => !v && setDeletingHead(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingHead?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the head. Heads with recorded expenses cannot be deleted — archive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteHead}
              className="bg-red-600 hover:bg-red-700 rounded-xl font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
