import React, { useState, useEffect } from "react";
import { Clock, Calendar, Save, Trash2, Edit3, Plus } from "lucide-react";
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
import { useNumericInput } from "@/hooks/useNumericInput";
import { toast } from "sonner";

export default function ExtraHoursModal({ open, setOpen, worker, onSave, onDelete, selectedMonth, formatCurrency }) {
  const { sanitize } = useNumericInput();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    hours: 0,
    ratePerHour: 0,
  });

  const existingEntries = worker?.extraHours || [];
  const totalAmount = existingEntries.reduce((sum, e) => sum + e.amount, 0);
  const isPaid = !!worker?.payments?.[0];

  useEffect(() => {
    if (open) {
      setForm({ hours: 0, ratePerHour: worker?.hourlyOvertimeRate || 0 });
      setEditingId(null);
    }
  }, [open, worker]);

  const handleEdit = (entry) => {
    if (isPaid) return toast.error("Cannot edit overtime for paid salary.");
    setEditingId(entry.id);
    setForm({
      hours: entry.hours,
      ratePerHour: entry.ratePerHour,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ hours: 0, ratePerHour: worker?.hourlyOvertimeRate || 0 });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isPaid) return toast.error("Month already paid.");
    if (form.hours <= 0) return toast.error("Hours must be positive.");
    
    onSave({
      ...form,
      amount: form.hours * form.ratePerHour
    }, editingId);
    handleCancelEdit();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl bg-white">
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Clock size={24} />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900">Overtime / Extra Hours</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Manage extra hours for <b>{worker?.name}</b> ({selectedMonth})
            </DialogDescription>
          </div>
        </div>

        <div className="p-0 max-h-[70vh] overflow-y-auto">
          <div className="p-6 bg-white space-y-4">
            <div className="flex items-center justify-between">
               <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Logs</Label>
               <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Earned</p>
                  <p className="font-black text-sm text-indigo-600">{formatCurrency(totalAmount)}</p>
               </div>
            </div>
            
            <div className="space-y-2">
              {existingEntries.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed rounded-2xl border-slate-100 text-slate-400 text-xs font-medium">
                  No extra hours recorded this month
                </div>
              ) : (
                existingEntries.map(ent => (
                  <div key={ent.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-indigo-600">
                        <Clock size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{ent.hours} hrs @ {formatCurrency(ent.ratePerHour)}</p>
                        <p className="text-[10px] text-indigo-600 font-bold">Total: {formatCurrency(ent.amount)}</p>
                      </div>
                    </div>
                    {!isPaid && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400" onClick={() => handleEdit(ent)}><Edit3 size={12}/></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(ent.id)}><Trash2 size={12}/></Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {!isPaid ? (
            <form onSubmit={handleSubmit} className="p-6 bg-slate-50/50 border-t space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {editingId ? "Update Entry" : "Record Extra Hours"}
              </Label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Hours</Label>
                  <div className="relative">
                    <Input 
                      type="text" inputMode="numeric"
                      value={form.hours === 0 ? "" : form.hours} 
                      onChange={(e) => {
                        const num = sanitize(e.target.value);
                        if (num !== null) setForm(prev => ({ ...prev, hours: num }));
                      }}
                      className="h-10 pl-9 rounded-xl border-slate-200 focus:bg-white font-bold"
                      placeholder="0.0"
                    />
                    <div className="absolute left-3 top-2.5 text-slate-400"><Clock size={16}/></div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Rate (Rs/hr)</Label>
                  <Input 
                    type="text" inputMode="numeric"
                    value={form.ratePerHour} 
                    onChange={(e) => {
                      const num = sanitize(e.target.value);
                      if (num !== null) setForm(prev => ({ ...prev, ratePerHour: num }));
                    }}
                    className="h-10 rounded-xl border-slate-200 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {editingId && (
                  <Button variant="ghost" type="button" onClick={handleCancelEdit} className="h-10 px-4 font-bold text-slate-500 rounded-xl">Cancel</Button>
                )}
                <Button type="submit" className="h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98]">
                  {editingId ? <><Save size={16} className="mr-2"/> Update</> : <><Plus size={16} className="mr-2"/> Add Overtime</>}
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-6 bg-slate-50 border-t flex flex-col items-center justify-center text-center gap-2">
               <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><Save size={18}/></div>
               <p className="text-xs font-bold text-slate-600 uppercase">Salaries Already Paid</p>
               <p className="text-[10px] text-slate-400 font-medium px-4">Undo the payment to modify overtime records for this month.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}