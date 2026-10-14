import React, { useState, useEffect, useMemo } from "react";
import { Receipt, Tag, Calendar, Wallet, FileText } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useNumericInput } from "@/hooks/useNumericInput";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const todayISO = () => new Date().toISOString().split("T")[0];

export default function AddExpenseModal({
  open,
  setOpen,
  onSave,
  initialData,
  heads,
  paymentMethods,
}) {
  const isEdit = !!initialData;
  const { sanitize } = useNumericInput();

  const activeHeads = useMemo(() => heads.filter((h) => !h.archived), [heads]);
  const activeMethods = useMemo(() => paymentMethods.filter((m) => !m.archived), [paymentMethods]);

  const [form, setForm] = useState({
    headId: "",
    date: todayISO(),
    amount: 0,
    detail: "",
    paymentMethod: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        headId: initialData?.headId || activeHeads[0]?.id || "",
        date: initialData?.date
          ? new Date(initialData.date).toISOString().split("T")[0]
          : todayISO(),
        amount: initialData?.amount || 0,
        detail: initialData?.detail || "",
        paymentMethod: initialData?.paymentMethod || activeMethods[0]?.name || "",
      });
    }
  }, [open, initialData, activeHeads, activeMethods]);

  const selectedMethod = activeMethods.find((m) => m.name === form.paymentMethod);
  const availableBalance = Number(selectedMethod?.currentBalance ?? 0);
  // When editing the same method, the existing expense amount is virtually returned to the balance
  const offset = isEdit && initialData?.paymentMethod === form.paymentMethod ? Number(initialData.amount) : 0;
  const projectedBalance = availableBalance + offset;
  const insufficient = Number(form.amount) > 0 && Number(form.amount) > projectedBalance;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.headId) return toast.error("Pick an expense head");
    if (!form.paymentMethod) return toast.error("Pick a payment source");
    if (Number(form.amount) <= 0) return toast.error("Enter a valid amount");
    if (insufficient) return toast.error(`Insufficient balance in ${form.paymentMethod}`);

    setSubmitting(true);
    try {
      await onSave({
        headId: form.headId,
        date: form.date,
        amount: Number(form.amount),
        detail: form.detail || "",
        paymentMethod: form.paymentMethod,
      });
      setOpen(false);
    } catch (_) {
      // toast handled by context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[560px] p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl bg-white">
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-emerald-700 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Receipt size={24} />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {isEdit ? "Edit expense" : "Record expense"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Track outgoing spending and debit the chosen payment source.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Tag size={12} /> Expense Head *
              </Label>
              <Select
                value={form.headId}
                onValueChange={(val) => setForm((p) => ({ ...p, headId: val }))}
              >
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder={activeHeads.length === 0 ? "Add a head first" : "Select head"} />
                </SelectTrigger>
                <SelectContent>
                  {activeHeads.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500 font-medium">
                      No heads yet. Create one in the Heads tab.
                    </div>
                  ) : (
                    activeHeads.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar size={12} /> Expense Date *
              </Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Amount (Rs) *</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={form.amount === 0 ? "" : form.amount}
                onChange={(e) => {
                  const num = sanitize(e.target.value);
                  if (num !== null) setForm((p) => ({ ...p, amount: num }));
                }}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white font-bold text-emerald-700"
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Wallet size={12} /> Payment Source *
              </Label>
              <Select
                value={form.paymentMethod}
                onValueChange={(val) => setForm((p) => ({ ...p, paymentMethod: val }))}
              >
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder={activeMethods.length === 0 ? "Add a method first" : "Select method"} />
                </SelectTrigger>
                <SelectContent>
                  {activeMethods.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500 font-medium">
                      No payment methods configured.
                    </div>
                  ) : (
                    activeMethods.map((m) => (
                      <SelectItem key={m.id} value={m.name}>
                        {m.name} — Rs {Math.round(m.currentBalance).toLocaleString("en-PK")}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedMethod && (
                <p className={cn(
                  "text-[11px] font-bold",
                  insufficient ? "text-red-600" : "text-slate-500"
                )}>
                  Available: Rs {Math.round(projectedBalance).toLocaleString("en-PK")}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText size={12} /> Expense Detail (Optional)
            </Label>
            <Textarea
              value={form.detail}
              onChange={(e) => setForm((p) => ({ ...p, detail: e.target.value }))}
              className="rounded-xl bg-slate-50 border-slate-200 focus:bg-white min-h-[80px]"
              placeholder="e.g. Electricity bill — September, vendor name, invoice ref."
            />
          </div>

          {insufficient && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-700">
              Insufficient balance in <b>{form.paymentMethod}</b>. Available Rs {Math.round(projectedBalance).toLocaleString("en-PK")}.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-11 px-6 font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || insufficient}
              className="h-11 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white font-bold px-8 rounded-xl shadow-lg shadow-emerald-700/20"
            >
              {submitting ? "Saving..." : isEdit ? "Update" : "Record Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
