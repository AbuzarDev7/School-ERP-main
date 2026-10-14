import { useState, useEffect, useMemo } from "react";
import { Hash, Save, Loader2, Ticket, History, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/context/SettingsContext";
import { useVouchers } from "@/context/VoucherContext";
import { useNumericInput } from "@/hooks/useNumericInput";
import { toast } from "sonner";

const CADENCE_OPTIONS = [
  { value: "YEARLY", label: "Reset yearly", hint: "Serial restarts at 1 each January. e.g. V-2026-0001" },
  { value: "MONTHLY", label: "Reset monthly", hint: "Serial restarts at 1 each month. e.g. V-202605-0001" },
  { value: "NEVER", label: "Never reset (continuous)", hint: "Serial counts up forever. e.g. V-0001" },
];

export default function VouchersTab() {
  const { settings, updateSettings } = useSettings();
  const { vouchers } = useVouchers();
  const { sanitize } = useNumericInput();

  // Server returns vouchers sorted by createdAt desc, so the head of the
  // list is the most recently issued one. Filter out any pending
  // placeholders just in case.
  const lastVoucher = useMemo(() => {
    return vouchers.find((v) => v.voucherNumber && !v.voucherNumber.startsWith("__PENDING_")) || null;
  }, [vouchers]);

  const [form, setForm] = useState({
    voucherPrefix: "V",
    voucherPadding: 4,
    voucherResetCadence: "YEARLY",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      voucherPrefix: settings.voucherPrefix || "V",
      voucherPadding: Number(settings.voucherPadding || 4),
      voucherResetCadence: settings.voucherResetCadence || "YEARLY",
    });
  }, [settings]);

  const dirty =
    form.voucherPrefix !== (settings.voucherPrefix || "V") ||
    Number(form.voucherPadding) !== Number(settings.voucherPadding || 4) ||
    form.voucherResetCadence !== (settings.voucherResetCadence || "YEARLY");

  const preview = (() => {
    const prefix = (form.voucherPrefix || "V").trim();
    const padding = Math.max(2, Math.min(10, Number(form.voucherPadding) || 4));
    const cadence = form.voucherResetCadence;
    const now = new Date();
    let segment = null;
    if (cadence === "YEARLY") segment = `${now.getFullYear()}`;
    else if (cadence === "MONTHLY") {
      segment = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}`;
    }
    const serial = "1".padStart(padding, "0");
    return segment ? `${prefix}-${segment}-${serial}` : `${prefix}-${serial}`;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dirty) return;
    if (!form.voucherPrefix.trim()) return toast.error("Prefix is required");

    const padding = Number(form.voucherPadding);
    if (!Number.isInteger(padding) || padding < 2 || padding > 10) {
      return toast.error("Padding must be a whole number between 2 and 10");
    }

    setSaving(true);
    try {
      await updateSettings({
        voucherPrefix: form.voucherPrefix.trim(),
        voucherPadding: padding,
        voucherResetCadence: form.voucherResetCadence,
      });
      toast.success("Voucher numbering updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Live preview: last issued ➜ upcoming */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute right-12 -bottom-4 w-24 h-24 bg-white/5 rounded-full" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-4 md:items-center">
          {/* Last issued */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-100 mb-3 flex items-center gap-2">
              <History size={12} />
              Last Generated
            </p>
            <h3 className="text-3xl md:text-4xl font-black tracking-tight break-all">
              {lastVoucher ? lastVoucher.voucherNumber : "—"}
            </h3>
            <p className="text-[11px] font-medium text-emerald-100 mt-2">
              {lastVoucher
                ? `Issued ${new Date(lastVoucher.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`
                : "No vouchers generated yet"}
            </p>
          </div>

          {/* Arrow divider */}
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight size={28} className="text-white/40" />
          </div>

          {/* Upcoming */}
          <div className="md:text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-100 mb-3 flex items-center gap-2 md:justify-end">
              <Ticket size={12} />
              Upcoming Voucher
            </p>
            <h3 className="text-3xl md:text-4xl font-black tracking-tight break-all">{preview}</h3>
            <p className="text-[11px] font-medium text-emerald-100 mt-2">
              Updates as you tweak prefix, padding, or cadence below
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20">
            <Ticket size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Voucher Numbering</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Existing voucher numbers won't change — these rules apply only to new vouchers
            </p>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prefix</Label>
            <div className="relative">
              <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                value={form.voucherPrefix}
                onChange={(e) => setForm((f) => ({ ...f, voucherPrefix: e.target.value.toUpperCase().slice(0, 10) }))}
                placeholder="V"
                className="h-12 pl-11 bg-slate-50 border-slate-200 rounded-xl font-black text-slate-700 uppercase"
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium pt-1">2–10 chars. e.g. V, FEE, INV.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Padding (digits)</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={form.voucherPadding}
              onChange={(e) => {
                const v = sanitize(e.target.value, 10);
                if (v !== null) setForm((f) => ({ ...f, voucherPadding: v }));
              }}
              className="h-12 bg-slate-50 border-slate-200 rounded-xl font-black text-slate-700"
            />
            <p className="text-[11px] text-slate-400 font-medium pt-1">
              4 → 0001, 6 → 000001. Min 2, max 10.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reset Cadence</Label>
            <Select
              value={form.voucherResetCadence}
              onValueChange={(v) => setForm((f) => ({ ...f, voucherResetCadence: v }))}
            >
              <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CADENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col">
                      <span className="font-bold">{opt.label}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{opt.hint}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-400 font-medium pt-1">
              Cadence affects how the date segment is included in the voucher number.
            </p>
          </div>
        </div>

        <div className="px-8 py-5 border-t bg-slate-50 flex justify-end">
          <Button
            type="submit"
            disabled={!dirty || saving}
            className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>
    </form>
  );
}
