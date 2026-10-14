import React, { useMemo, useState, useCallback } from "react";
import {
  Plus,
  ArrowLeftRight,
  Wallet,
  Pencil,
  Archive,
  ArchiveRestore,
  History,
  Loader2,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { usePaymentMethods } from "@/context/PaymentMethodContext";
import AddMethodModal from "./AddMethodModal";
import TransferMethodModal from "./TransferMethodModal";

const RANGES = ["all", "today", "week", "month", "custom"];
const RANGE_LABELS = { all: "All", today: "Today", week: "This week", month: "This month", custom: "Custom" };

function startOf(unit) {
  const d = new Date();
  if (unit === "today") {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (unit === "week") {
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (unit === "month") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null;
}

const formatCurrency = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
const formatDate = (d) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

export default function PaymentMethods() {
  const {
    methods,
    transfers,
    loading,
    addMethod,
    editMethod,
    archiveMethod,
    unarchiveMethod,
    transfer,
    removeTransfer,
  } = usePaymentMethods();

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [archiving, setArchiving] = useState(null);
  const [transferToDelete, setTransferToDelete] = useState(null);

  const [range, setRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const activeMethods = useMemo(() => methods.filter((m) => !m.archived), [methods]);
  const archivedMethods = useMemo(() => methods.filter((m) => m.archived), [methods]);

  const filteredTransfers = useMemo(() => {
    if (range === "all") return transfers;
    if (range === "custom") {
      if (!customFrom && !customTo) return transfers;
      return transfers.filter((t) => {
        const d = new Date(t.date);
        if (customFrom && d < new Date(customFrom)) return false;
        if (customTo && d > new Date(customTo + "T23:59:59")) return false;
        return true;
      });
    }
    const start = startOf(range);
    if (!start) return transfers;
    return transfers.filter((t) => new Date(t.date) >= start);
  }, [transfers, range, customFrom, customTo]);

  const totalTransferAmount = useMemo(
    () => filteredTransfers.reduce((s, t) => s + Number(t.amount || 0), 0),
    [filteredTransfers]
  );

  const handleSaveMethod = useCallback(
    async (data) => {
      if (editing) {
        await editMethod(editing.id, { name: data.name });
      } else {
        await addMethod(data);
      }
      setEditing(null);
    },
    [editing, editMethod, addMethod]
  );

  const openEdit = (method) => {
    setEditing(method);
    setShowAdd(true);
  };

  const openAdd = () => {
    setEditing(null);
    setShowAdd(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Payment Methods</h2>
          <p className="text-slate-500 text-sm font-medium">Configure cash, wallet and bank channels with running balances</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => setShowTransfer(true)}
            disabled={activeMethods.length < 2}
            className="h-11 rounded-xl font-bold border-slate-200 bg-white shadow-sm gap-2 w-full sm:w-auto"
          >
            <ArrowLeftRight size={16} /> Transfer
          </Button>
          <Button onClick={openAdd} className="h-11 p-0 rounded-xl font-bold border-2 border-emerald-600 bg-transparent hover:bg-transparent shadow-lg shadow-emerald-900/20 transition-all overflow-hidden group w-full sm:w-auto">
            <div className="flex items-center justify-center w-full h-full bg-emerald-600 px-6 animate-fast-blink text-white transition-colors group-hover:animate-none group-hover:bg-emerald-700">
              <Plus className="mr-2 h-5 w-5" /> Add Method
            </div>
          </Button>
        </div>
      </div>

      {/* Active Methods */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 text-slate-500">
            <Wallet size={14} />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Active Methods</span>
          </div>
          <span className="text-sm font-bold text-slate-400">{activeMethods.length}</span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={36} className="animate-spin mb-3 opacity-30" />
            <p className="font-bold text-sm">Loading methods...</p>
          </div>
        ) : activeMethods.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <Wallet size={36} className="mx-auto opacity-20 mb-3 text-slate-400" />
            <p className="font-bold text-slate-500">No payment methods yet</p>
            <p className="text-xs text-slate-400 font-medium mt-1">Add your first method to start tracking balances.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMethods.map((m) => (
              <MethodCard
                key={m.id}
                method={m}
                onEdit={() => openEdit(m)}
                onArchive={() => setArchiving(m)}
                onTransfer={() => setShowTransfer(true)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Archived (collapsed) */}
      {archivedMethods.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 text-slate-500">
              <Archive size={14} />
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">Archived</span>
            </div>
            <span className="text-sm font-bold text-slate-400">{archivedMethods.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {archivedMethods.map((m) => (
              <div
                key={m.id}
                className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between opacity-70"
              >
                <div>
                  <p className="font-black uppercase text-slate-700 tracking-wide text-sm">{m.name}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Balance · {formatCurrency(m.currentBalance)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg text-emerald-600 hover:bg-emerald-50"
                  onClick={() => unarchiveMethod(m.id)}
                  title="Restore"
                >
                  <ArchiveRestore size={16} />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Transfer History */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 text-slate-500">
            <History size={14} />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Transfer History</span>
          </div>
          <span className="text-sm font-bold text-slate-400">{filteredTransfers.length}</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "h-9 px-4 rounded-full text-xs font-bold transition-colors",
                    range === r
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
              {range === "custom" && (
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-bold"
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-bold"
                  />
                </div>
              )}
            </div>
            <div className="text-xs font-bold text-slate-500">
              Total: <span className="text-slate-900 font-black">{formatCurrency(totalTransferAmount)}</span>
            </div>
          </div>

          {filteredTransfers.length === 0 ? (
            <div className="py-14 text-center text-sm font-medium text-slate-400">
              No transfers yet. Move money between methods using the Transfer button above.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredTransfers.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <span className="uppercase">{t.fromMethod?.name}</span>
                      <ArrowRight size={14} className="text-slate-400" />
                      <span className="uppercase">{t.toMethod?.name}</span>
                    </div>
                    {t.note && <span className="text-xs text-slate-500 font-medium truncate hidden sm:inline">— {t.note}</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] text-slate-400 font-bold uppercase whitespace-nowrap hidden sm:inline">
                      {formatDate(t.date)}
                    </span>
                    <span className="font-black text-emerald-700 whitespace-nowrap">{formatCurrency(t.amount)}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setTransferToDelete(t)}
                      className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <AddMethodModal
        open={showAdd}
        setOpen={(v) => {
          setShowAdd(v);
          if (!v) setEditing(null);
        }}
        onSave={handleSaveMethod}
        initialData={editing}
        loading={loading}
      />

      <TransferMethodModal
        open={showTransfer}
        setOpen={setShowTransfer}
        methods={methods}
        onTransfer={transfer}
        formatCurrency={formatCurrency}
      />

      <AlertDialog open={!!archiving} onOpenChange={(v) => !v && setArchiving(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {archiving?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Archiving hides this method from selectors but keeps its history. You can restore it any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (archiving) await archiveMethod(archiving.id);
                setArchiving(null);
              }}
              className="bg-emerald-700 hover:bg-emerald-800 rounded-xl font-bold"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!transferToDelete} onOpenChange={(v) => !v && setTransferToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove transfer?</AlertDialogTitle>
            <AlertDialogDescription>
              The transferred amount will be returned to the source method's balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (transferToDelete) await removeTransfer(transferToDelete.id);
                setTransferToDelete(null);
              }}
              className="bg-red-600 hover:bg-red-700 rounded-xl font-bold"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MethodCard({ method, onEdit, onArchive, onTransfer }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-black uppercase text-slate-900 tracking-wide truncate">{method.name}</p>
          <p className="text-[11px] font-bold text-slate-400 uppercase mt-1">
            Opening · {formatCurrency(method.openingBalance)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon" variant="ghost" onClick={onTransfer} className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-50" title="Transfer">
            <ArrowLeftRight size={14} className="text-slate-500" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onEdit} className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-50" title="Rename">
            <Pencil size={14} className="text-slate-500" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onArchive} className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-200" title="Archive">
            <Archive size={14} className="text-amber-600" />
          </Button>
        </div>
      </div>
      <div className="flex items-end justify-between border-t border-slate-100 pt-3">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Current</span>
        <span className="text-2xl font-black text-emerald-700 leading-none">{formatCurrency(method.currentBalance)}</span>
      </div>
    </div>
  );
}
