import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNumericInput } from "@/hooks/useNumericInput";
import { toast } from "sonner";

const todayISO = () => new Date().toISOString().split("T")[0];

export default function TransferMethodModal({ open, setOpen, methods, onTransfer, formatCurrency }) {
  const { sanitize } = useNumericInput();
  const active = useMemo(() => methods.filter((m) => !m.archived), [methods]);

  const [form, setForm] = useState({
    fromMethodId: "",
    toMethodId: "",
    amount: 0,
    date: todayISO(),
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const first = active[0]?.id || "";
      const second = active.find((m) => m.id !== first)?.id || "";
      setForm({
        fromMethodId: first,
        toMethodId: second,
        amount: 0,
        date: todayISO(),
        note: "",
      });
    }
  }, [open, active]);

  const fromMethod = active.find((m) => m.id === form.fromMethodId);
  const toMethod = active.find((m) => m.id === form.toMethodId);

  const amount = Number(form.amount) || 0;
  const availableBalance = Number(fromMethod?.currentBalance ?? 0);
  const exceedsBalance = !!fromMethod && amount > availableBalance;

  // If the user typed an amount, then switched the From method to one with a
  // smaller balance, re-clamp the amount so it never silently exceeds the new
  // method's available funds. The submit-time check would catch it anyway, but
  // this keeps the displayed value honest.
  useEffect(() => {
    if (!fromMethod) return;
    if (amount > availableBalance) {
      setForm((p) => ({ ...p, amount: availableBalance }));
    }
  }, [fromMethod, availableBalance, amount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fromMethodId || !form.toMethodId) return toast.error("Select both methods");
    if (form.fromMethodId === form.toMethodId) return toast.error("Source and destination must differ");
    if (amount <= 0) return toast.error("Enter a valid amount");
    if (exceedsBalance) {
      return toast.error(`Insufficient balance. Available: ${formatCurrency(availableBalance)}`);
    }
    setSubmitting(true);
    try {
      await onTransfer({
        fromMethodId: form.fromMethodId,
        toMethodId: form.toMethodId,
        amount,
        date: form.date,
        note: form.note,
      });
      setOpen(false);
    } catch (_) {
      // toast handled in context
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    form.fromMethodId &&
    form.toMethodId &&
    form.fromMethodId !== form.toMethodId &&
    amount > 0 &&
    !exceedsBalance &&
    !submitting;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[520px] p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl bg-white">
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <ArrowLeftRight size={24} />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900">Transfer between methods</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Move funds between two of your payment methods.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">From *</Label>
              <Select
                value={form.fromMethodId}
                onValueChange={(val) => setForm((p) => ({ ...p, fromMethodId: val }))}
              >
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 uppercase font-bold">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {active.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500 font-medium">
                Available: <span className="font-bold text-slate-700">{fromMethod ? formatCurrency(fromMethod.currentBalance) : "—"}</span>
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-center pb-7">
              <ArrowRight size={20} className="text-slate-400" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">To *</Label>
              <Select
                value={form.toMethodId}
                onValueChange={(val) => setForm((p) => ({ ...p, toMethodId: val }))}
              >
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 uppercase font-bold">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {active
                    .filter((m) => m.id !== form.fromMethodId)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500 font-medium">
                Current: <span className="font-bold text-slate-700">{toMethod ? formatCurrency(toMethod.currentBalance) : "—"}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Amount (Rs) *</Label>
                {fromMethod && availableBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, amount: availableBalance }))}
                    className="text-[10px] font-black uppercase tracking-wider text-emerald-600 hover:text-emerald-700"
                  >
                    Max
                  </button>
                )}
              </div>
              <Input
                type="text"
                inputMode="numeric"
                value={form.amount === 0 ? "" : form.amount}
                onChange={(e) => {
                  // Cap any sanitized input at the source method's available balance
                  // so the field can never be set above what's actually transferable.
                  const num = sanitize(e.target.value);
                  if (num === null) return;
                  const cap = fromMethod ? Math.min(num, availableBalance) : num;
                  setForm((p) => ({ ...p, amount: cap }));
                }}
                className={`h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white ${
                  exceedsBalance ? "border-red-400 bg-red-50/30 focus:bg-red-50/40" : ""
                }`}
                placeholder="0"
              />
              {fromMethod && (
                <p className={`text-[11px] font-bold ${exceedsBalance ? "text-red-600" : "text-slate-500"}`}>
                  {exceedsBalance
                    ? `Exceeds balance. Max ${formatCurrency(availableBalance)}.`
                    : <>Available <span className="text-slate-700">{formatCurrency(availableBalance)}</span></>}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Note (Optional)</Label>
            <Input
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              placeholder="e.g. ATM withdrawal, cash to wallet top-up"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="h-11 px-6 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="h-11 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold px-8 rounded-xl shadow-lg shadow-emerald-700/20"
            >
              {submitting
                ? "Transferring..."
                : exceedsBalance
                  ? "Insufficient funds"
                  : "Transfer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
