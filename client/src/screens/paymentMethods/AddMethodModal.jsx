import React, { useState, useEffect } from "react";
import { Wallet, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNumericInput } from "@/hooks/useNumericInput";
import { toast } from "sonner";

export default function AddMethodModal({ open, setOpen, onSave, initialData, loading }) {
  const { sanitize } = useNumericInput();
  const isEdit = !!initialData;
  const [form, setForm] = useState({ name: "", openingBalance: 0 });

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        openingBalance: initialData?.openingBalance ?? 0,
      });
    }
  }, [open, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    try {
      await onSave({
        name: form.name.trim(),
        openingBalance: Number(form.openingBalance) || 0,
      });
      setOpen(false);
    } catch (_) {
      // toast already shown by context
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl bg-white">
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Wallet size={24} />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {isEdit ? "Edit payment method" : "Add payment method"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Configure a wallet, cash drawer, or bank account.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              placeholder="e.g. Cash, EasyPaisa, HBL Bank — XX1234"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Opening Balance (Rs)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={form.openingBalance === 0 ? "" : form.openingBalance}
              onChange={(e) => {
                const num = sanitize(e.target.value);
                if (num !== null) setForm((p) => ({ ...p, openingBalance: num }));
              }}
              className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white"
              placeholder="0"
              disabled={isEdit}
            />
            <p className="text-[11px] text-slate-500 font-medium leading-snug">
              {isEdit
                ? "Opening balance is locked once a method is created. New cashbook entries adjust the current balance."
                : "The starting balance you have in this method right now (e.g. cash in hand). All cashbook entries against this method will adjust this number from here on."}
            </p>
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
              disabled={loading}
              className="h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-8 rounded-xl shadow-lg shadow-emerald-700/20"
            >
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
