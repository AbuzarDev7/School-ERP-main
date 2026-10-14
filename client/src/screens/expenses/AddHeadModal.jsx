import React, { useState, useEffect } from "react";
import { Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AddHeadModal({ open, setOpen, onSave, initialData }) {
  const isEdit = !!initialData;
  const [form, setForm] = useState({ name: "", description: "" });

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        description: initialData?.description || "",
      });
    }
  }, [open, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    try {
      await onSave({ name: form.name.trim(), description: form.description?.trim() || "" });
      setOpen(false);
    } catch (_) {
      // toast handled by context
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl bg-white">
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-emerald-700 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Tag size={24} />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {isEdit ? "Edit expense head" : "Add expense head"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Categories let you group spending — e.g. Utilities, Stationery, Rent.
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
              placeholder="e.g. Utilities, Rent, Stationery"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Description (Optional)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="rounded-xl bg-slate-50 border-slate-200 focus:bg-white min-h-[80px]"
              placeholder="What kind of spending falls under this head?"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-11 px-6 font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
              Cancel
            </Button>
            <Button type="submit" className="h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-8 rounded-xl shadow-lg shadow-emerald-700/20">
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
