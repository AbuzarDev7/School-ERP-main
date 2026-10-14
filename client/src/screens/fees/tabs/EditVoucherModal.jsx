import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Edit modal for an UNPAID voucher (paidAmount === 0). Lets the cashier tweak
// the dueDate and the four money columns the server's edit endpoint accepts —
// totalPayable is auto-derived from amount + arrears + fine - discount, so we
// only display it as a preview.
export default function EditVoucherModal({ open, setOpen, voucher, studentName, onSave }) {
  const [form, setForm] = useState({
    dueDate: "",
    amount: 0,
    fine: 0,
    discount: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !voucher) return;
    setForm({
      dueDate: voucher.dueDate ? new Date(voucher.dueDate).toISOString().split("T")[0] : "",
      amount: Number(voucher.amount || 0),
      fine: Number(voucher.fine || 0),
      discount: Number(voucher.discount || 0),
    });
  }, [open, voucher]);

  // Live preview of the new totalPayable — keeps the cashier honest about the
  // effect of waiving a fine vs. lowering the amount, since both look like
  // "Rs. 200 less" in the form but differ in what gets billed.
  const previewTotal = useMemo(() => {
    const amount = Number(form.amount || 0);
    const arrears = Number(voucher?.arrears || 0);
    const fine = Number(form.fine || 0);
    const discount = Number(form.discount || 0);
    return Math.max(0, amount + arrears + fine - discount);
  }, [form.amount, form.fine, form.discount, voucher?.arrears]);

  const handleNumber = (key, raw) => {
    const cleaned = raw.replace(/[^\d.]/g, "");
    const value = cleaned === "" ? 0 : Number(cleaned);
    setForm((f) => ({ ...f, [key]: Number.isFinite(value) ? value : 0 }));
  };

  const handleSubmit = async () => {
    if (!form.dueDate) return toast.error("Due date is required");
    if (Number(form.amount) < 0) return toast.error("Amount can't be negative");

    setSubmitting(true);
    const promise = onSave({
      dueDate: form.dueDate,
      amount: Number(form.amount),
      fine: Number(form.fine),
      discount: Number(form.discount),
    });

    toast.promise(promise, {
      loading: "Saving voucher edits...",
      success: () => {
        setSubmitting(false);
        setOpen(false);
        return "Voucher updated";
      },
      error: (err) => {
        setSubmitting(false);
        if (err?.response?.status === 409) {
          return err?.response?.data?.error || "Voucher can no longer be edited.";
        }
        return err?.response?.data?.error || "Failed to update voucher";
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-125 p-0 overflow-hidden shadow-xl border border-slate-200 rounded-xl bg-white">
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Pencil size={18} />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">Edit Voucher</DialogTitle>
            <DialogDescription className="text-[11px] font-medium mt-0.5">
              {voucher?.voucherNumber} · {studentName}
            </DialogDescription>
          </div>
        </div>

        {voucher && (
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="h-11 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Amount</Label>
                <Input
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => handleNumber("amount", e.target.value)}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fine</Label>
                <Input
                  inputMode="numeric"
                  value={form.fine}
                  onChange={(e) => handleNumber("fine", e.target.value)}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-amber-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Discount</Label>
                <Input
                  inputMode="numeric"
                  value={form.discount}
                  onChange={(e) => handleNumber("discount", e.target.value)}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-emerald-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-blue-600">New Total</Label>
                <Input
                  value={`₨ ${previewTotal.toLocaleString("en-PK")}`}
                  disabled
                  className="h-11 bg-blue-50 border-blue-200 rounded-xl font-black text-blue-700"
                />
              </div>
            </div>

            {Number(voucher.arrears || 0) > 0 && (
              <p className="text-[11px] text-slate-500 font-medium">
                Includes carried-forward arrears of <b>₨ {Number(voucher.arrears).toLocaleString("en-PK")}</b>.
                Adjust through the previous voucher if you need to remove those.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="px-6 py-5 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting} className="h-11 px-6 font-bold text-slate-600 hover:bg-slate-200 rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-11 bg-blue-600 hover:bg-blue-700 text-white px-8 font-bold rounded-xl shadow-lg shadow-blue-600/20"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
