import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { History, Wallet, TrendingDown, Clock, Loader2, Calendar, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkers } from "@/context/WorkerContext";
import { toast } from "sonner";

const formatCurrency = (n) => `Rs. ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
const formatDate = (raw) => raw
  ? new Date(raw).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })
  : "—";
const formatMonth = (ym) => {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || "—";
  const [y, m] = ym.split("-");
  return `${new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-US", { month: "long" })} ${y}`;
};

export default function WorkerHistoryModal({ open, setOpen, worker }) {
  const { workerHistories, loadWorkerHistory } = useWorkers();
  const [fetching, setFetching] = useState(false);
  const [sortDir, setSortDir] = useState("desc"); // newest first by default

  // Read straight from the context cache. Cache hits render instantly; only
  // the very first open of a given worker pays the network cost. Mutations
  // (add/edit/delete payment, advance, overtime) clear the cache in
  // WorkerContext, so opens after a change always see fresh data.
  const fullWorker = worker?.id ? workerHistories[worker.id] : null;
  const showSpinner = fetching && !fullWorker;

  useEffect(() => {
    if (!open || !worker?.id) return;
    if (fullWorker) return; // cache hit, nothing to fetch
    let cancelled = false;
    setFetching(true);
    loadWorkerHistory(worker.id)
      .catch((err) => {
        console.error(err);
        if (!cancelled) toast.error("Couldn't load history. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => { cancelled = true; };
  }, [open, worker?.id, fullWorker, loadWorkerHistory]);

  const sortByDate = (a, b) => {
    const av = new Date(a.date || a.createdAt).getTime();
    const bv = new Date(b.date || b.createdAt).getTime();
    return sortDir === "desc" ? bv - av : av - bv;
  };

  const payments = useMemo(
    () => [...(fullWorker?.payments || [])].sort(sortByDate),
    [fullWorker, sortDir]
  );
  const advances = useMemo(
    () => [...(fullWorker?.advances || [])].sort(sortByDate),
    [fullWorker, sortDir]
  );
  const extraHours = useMemo(
    () => [...(fullWorker?.extraHours || [])].sort(sortByDate),
    [fullWorker, sortDir]
  );

  // Lifetime totals shown in the summary strip.
  const totals = useMemo(() => {
    const totalPaid = payments.reduce((s, p) => s + Number(p.netPaid || 0), 0);
    const totalAdvances = advances.reduce((s, a) => s + Number(a.amount || 0), 0);
    const totalOvertimeAmt = extraHours.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalOvertimeHrs = extraHours.reduce((s, e) => s + Number(e.hours || 0), 0);
    return { totalPaid, totalAdvances, totalOvertimeAmt, totalOvertimeHrs };
  }, [payments, advances, extraHours]);

  const SortToggle = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
      className="h-8 px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100"
    >
      <ArrowUpDown size={12} className="mr-1.5" />
      {sortDir === "desc" ? "Newest first" : "Oldest first"}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[96vw] sm:max-w-180 p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl bg-white max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <History size={24} />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-xl font-bold text-slate-900 truncate">
              {worker?.name || "Staff Member"} — History
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Full record of payments, advances, and overtime across every month
            </DialogDescription>
          </div>
        </div>

        {showSpinner ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 size={36} className="animate-spin opacity-30 mb-3" />
            <p className="font-bold text-sm">Loading history...</p>
          </div>
        ) : !fullWorker ? (
          <div className="py-20 text-center text-sm font-medium text-slate-400">
            No data available.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Lifetime totals */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <SummaryTile
                icon={<Wallet size={16} />}
                label="Lifetime Paid"
                value={formatCurrency(totals.totalPaid)}
                tone="emerald"
              />
              <SummaryTile
                icon={<TrendingDown size={16} />}
                label="Total Advances"
                value={formatCurrency(totals.totalAdvances)}
                tone="amber"
              />
              <SummaryTile
                icon={<Clock size={16} />}
                label="Overtime"
                value={`${totals.totalOvertimeHrs} hrs`}
                subtitle={formatCurrency(totals.totalOvertimeAmt)}
                tone="blue"
              />
            </div>

            <Tabs defaultValue="payments" className="w-full">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <TabsList className="bg-slate-100/60 p-1 rounded-xl">
                  <TabsTrigger value="payments" className="rounded-lg text-xs font-bold">
                    Payments ({payments.length})
                  </TabsTrigger>
                  <TabsTrigger value="advances" className="rounded-lg text-xs font-bold">
                    Advances ({advances.length})
                  </TabsTrigger>
                  <TabsTrigger value="overtime" className="rounded-lg text-xs font-bold">
                    Overtime ({extraHours.length})
                  </TabsTrigger>
                </TabsList>
                {SortToggle}
              </div>

              <TabsContent value="payments" className="mt-4">
                {payments.length === 0 ? (
                  <EmptyState icon={<Wallet size={28} />} message="No payments recorded yet." />
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <PaymentRow key={p.id} payment={p} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="advances" className="mt-4">
                {advances.length === 0 ? (
                  <EmptyState icon={<TrendingDown size={28} />} message="No advances recorded yet." />
                ) : (
                  <div className="space-y-2">
                    {advances.map((a) => (
                      <AdvanceRow key={a.id} advance={a} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="overtime" className="mt-4">
                {extraHours.length === 0 ? (
                  <EmptyState icon={<Clock size={28} />} message="No overtime entries recorded yet." />
                ) : (
                  <div className="space-y-2">
                    {extraHours.map((e) => (
                      <OvertimeRow key={e.id} entry={e} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end shrink-0">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="h-10 px-6 font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryTile({ icon, label, value, subtitle, tone = "slate" }) {
  const toneMap = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
  };
  return (
    <div className={cn("rounded-xl border p-3", toneMap[tone])}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</span>
      </div>
      <p className="text-lg font-black mt-1 leading-none">{value}</p>
      {subtitle && <p className="text-[10px] font-bold opacity-70 mt-1">{subtitle}</p>}
    </div>
  );
}

function PaymentRow({ payment }) {
  return (
    <div className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Wallet size={16} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 truncate">{formatMonth(payment.month)}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
              <Calendar size={10} className="inline mr-1 -mt-0.5" />
              Paid {formatDate(payment.date || payment.createdAt)}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-black text-emerald-600">{formatCurrency(payment.netPaid)}</p>
          {payment.method && (
            <p className="text-[10px] font-bold uppercase text-slate-500 mt-0.5">via {payment.method}</p>
          )}
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-medium text-slate-500">
        <Stat label="Salary" value={formatCurrency(payment.totalSalary)} />
        <Stat label="Overtime" value={`+${formatCurrency(payment.overtimeAmount)}`} tone="blue" />
        <Stat label="Absence" value={`-${formatCurrency(payment.absenceDeduction)}`} tone="red" />
        <Stat label="Advances" value={`-${formatCurrency(payment.advanceTotal)}`} tone="amber" />
      </div>
      {payment.notes && (
        <p className="text-[11px] text-slate-500 italic mt-2 pt-2 border-t border-slate-100">"{payment.notes}"</p>
      )}
    </div>
  );
}

function AdvanceRow({ advance }) {
  return (
    <div className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <TrendingDown size={16} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-800">{formatCurrency(advance.amount)}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide truncate">
            For {formatMonth(advance.month)} · {formatDate(advance.date || advance.createdAt)}
          </p>
          {advance.note && (
            <p className="text-[11px] text-slate-500 italic truncate">"{advance.note}"</p>
          )}
        </div>
      </div>
    </div>
  );
}

function OvertimeRow({ entry }) {
  const settled = !!entry.paymentId;
  const rate = Number(entry.hours) > 0 ? Number(entry.amount) / Number(entry.hours) : 0;
  return (
    <div className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <Clock size={16} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-800">
            {entry.hours} hrs <span className="text-slate-400 font-medium">× {formatCurrency(rate)}/hr</span>
          </p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide truncate">
            For {formatMonth(entry.month)} · {formatDate(entry.date || entry.createdAt)}
          </p>
          {entry.note && (
            <p className="text-[11px] text-slate-500 italic truncate">"{entry.note}"</p>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-black text-blue-600">{formatCurrency(entry.amount)}</p>
        <span
          className={cn(
            "inline-block text-[9px] px-2 py-0.5 rounded-full uppercase font-black mt-0.5",
            settled ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-600"
          )}
        >
          {settled ? "Settled" : "Pending"}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "slate" }) {
  const toneMap = {
    slate: "text-slate-700",
    blue: "text-blue-600",
    amber: "text-amber-600",
    red: "text-red-500",
  };
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn("font-bold mt-0.5", toneMap[tone])}>{value}</p>
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
      <div className="opacity-30 mb-2">{icon}</div>
      <p className="text-sm font-bold">{message}</p>
    </div>
  );
}
