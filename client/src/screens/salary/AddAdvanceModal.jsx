import React, { useState, useEffect } from "react";
import { TrendingDown, Calendar, Wallet, Trash2, Edit3, Plus, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNumericInput } from "@/hooks/useNumericInput";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePaymentMethods } from "@/context/PaymentMethodContext";

export default function AddAdvanceModal({ 
  open, 
  setOpen, 
  worker, 
  onSave, 
  onDelete, 
  selectedMonth, 
  formatCurrency 
}) {
  const { sanitize } = useNumericInput();
  const { activeMethods } = usePaymentMethods();
  const [editingAdvanceId, setEditingAdvanceId] = useState(null);
  const [form, setForm] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: "",
    method: "",
  });

  // Reactively pick the first active method until the user explicitly chooses one.
  // Avoids stale defaults captured before PaymentMethodContext finished loading.
  const effectiveMethod = form.method && activeMethods.some((m) => m.name === form.method)
    ? form.method
    : (activeMethods[0]?.name || "");

  // Calculate existing advances sum
  const existingAdvances = worker?.advances || [];
  const currentTotalAdvances = existingAdvances.reduce((sum, a) => sum + a.amount, 0);
  const remainingLimit = (worker?.monthlySalary || 0) - currentTotalAdvances;

  useEffect(() => {
    if (!open) {
      setEditingAdvanceId(null);
      setForm({
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        notes: "",
        method: "",
      });
    }
  }, [open]);

  const handleEdit = (advance) => {
    setEditingAdvanceId(advance.id);
    setForm({
      amount: advance.amount,
      date: new Date(advance.date).toISOString().split('T')[0],
      notes: advance.notes || "",
      method: advance.method || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingAdvanceId(null);
    setForm({
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      notes: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.amount <= 0) return toast.error("Amount must be positive");
    
    let currentLimit = remainingLimit;
    if (editingAdvanceId) {
        const oldAdvance = existingAdvances.find(a => a.id === editingAdvanceId);
        currentLimit += oldAdvance.amount;
    }

    if (form.amount > currentLimit) {
        return toast.error(`Advance exceeds monthly Salary limit. Max allowed: ${formatCurrency(currentLimit)}`);
    }

    if (!effectiveMethod) {
        return toast.error("Add a payment method before recording an advance");
    }

    onSave({ ...form, method: effectiveMethod }, editingAdvanceId);
    handleCancelEdit();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl bg-white">
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <TrendingDown size={24} />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900">Worker Advances</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Manage cash advances for <b>{worker?.name}</b> ({selectedMonth})
            </DialogDescription>
          </div>
        </div>

        <div className="p-0 max-h-[70vh] overflow-y-auto">
          <div className="p-6 bg-white space-y-4">
            <div className="flex items-center justify-between">
               <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly History</Label>
               <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Limit Remaining</p>
                  <p className={cn("font-black text-sm", remainingLimit > 0 ? "text-emerald-600" : "text-red-600")}>
                    {formatCurrency(remainingLimit)}
                  </p>
               </div>
            </div>
            
            <div className="space-y-2">
              {existingAdvances.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed rounded-2xl border-slate-100 text-slate-400 text-xs font-medium">
                  No advances recorded for this month
                </div>
              ) : (
                existingAdvances.map(adv => (
                  <div key={adv.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-amber-600">
                        <Calendar size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{formatCurrency(adv.amount)}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{new Date(adv.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => handleEdit(adv)}><Edit3 size={12}/></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(adv.id)}><Trash2 size={12}/></Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 bg-slate-50/50 border-t space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {editingAdvanceId ? "Update Advance" : "Record New Advance"}
            </Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Amount (Rs) *</Label>
                <div className="relative">
                  <Input 
                    type="text" 
                    inputMode="numeric"
                    value={form.amount === 0 ? "" : form.amount} 
                    onChange={(e) => {
                      const num = sanitize(e.target.value);
                      if (num !== null) setForm(prev => ({ ...prev, amount: num }));
                    }}
                    className="h-10 pl-9 rounded-xl border-slate-200 focus:bg-white font-bold text-amber-700"
                    placeholder="0"
                  />
                  <div className="absolute left-3 top-2.5 text-slate-400"><Wallet size={16}/></div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Date *</Label>
                <Input 
                  type="date" 
                  value={form.date} 
                  onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                  className="h-10 rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Paid Via *</Label>
              <Select value={effectiveMethod} onValueChange={(val) => setForm(prev => ({ ...prev, method: val }))}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder={activeMethods.length === 0 ? "Add a payment method first" : "Select method"} />
                </SelectTrigger>
                <SelectContent>
                  {activeMethods.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500 font-medium">
                      No payment methods configured. Add one in Payment Methods.
                    </div>
                  ) : (
                    activeMethods.map(m => (
                      <SelectItem key={m.id} value={m.name}>
                        {m.name} — {formatCurrency(m.currentBalance)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {effectiveMethod && (() => {
                const sel = activeMethods.find((m) => m.name === effectiveMethod);
                if (!sel) return null;
                return (
                  <p className="text-[11px] font-bold text-slate-500">
                    Available: {formatCurrency(sel.currentBalance)}
                  </p>
                );
              })()}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Notes (Optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                className="h-10 rounded-xl border-slate-200"
                placeholder="Reason for advance..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {editingAdvanceId && (
                <Button variant="ghost" type="button" onClick={handleCancelEdit} className="h-10 px-4 font-bold text-slate-500 rounded-xl">Cancel</Button>
              )}
              <Button type="submit" className="h-10 bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 rounded-xl shadow-lg shadow-amber-600/20 active:scale-[0.98]">
                {editingAdvanceId ? <><Save size={16} className="mr-2"/> Update</> : <><Plus size={16} className="mr-2"/> Record Advance</>}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}