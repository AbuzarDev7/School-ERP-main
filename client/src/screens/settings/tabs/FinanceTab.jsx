import { useState, useEffect } from "react";
import { CalendarClock, Coins, Save, Loader2, Briefcase, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/context/SettingsContext";
import { useNumericInput } from "@/hooks/useNumericInput";
import { toast } from "sonner";

export default function FinanceTab() {
  const { settings, updateSettings } = useSettings();
  const { sanitize } = useNumericInput();

  const [form, setForm] = useState({
    graceDays: 0,
    defaultLateFinePerDay: 0,
    absenceWorkingDaysDivisor: 30,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      graceDays: Number(settings.graceDays || 0),
      defaultLateFinePerDay: Number(settings.defaultLateFinePerDay || 0),
      absenceWorkingDaysDivisor: Number(settings.absenceWorkingDaysDivisor || 30),
    });
  }, [settings]);

  const dirty =
    Number(form.graceDays) !== Number(settings.graceDays || 0) ||
    Number(form.defaultLateFinePerDay) !== Number(settings.defaultLateFinePerDay || 0) ||
    Number(form.absenceWorkingDaysDivisor) !== Number(settings.absenceWorkingDaysDivisor || 30);

  const handleNumber = (key, raw, { max = Infinity, allowDecimal = false } = {}) => {
    const v = sanitize(raw, max, 0, { allowDecimals: allowDecimal });
    if (v !== null) setForm((f) => ({ ...f, [key]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dirty) return;

    if (form.graceDays < 0 || form.graceDays > 60) {
      return toast.error("Grace days must be between 0 and 60");
    }
    if (form.defaultLateFinePerDay < 0) {
      return toast.error("Fine per day cannot be negative");
    }
    if (form.absenceWorkingDaysDivisor < 1 || form.absenceWorkingDaysDivisor > 31) {
      return toast.error("Working-days divisor must be between 1 and 31");
    }

    setSaving(true);
    try {
      await updateSettings({
        graceDays: Number(form.graceDays),
        defaultLateFinePerDay: Number(form.defaultLateFinePerDay),
        absenceWorkingDaysDivisor: Number(form.absenceWorkingDaysDivisor),
      });
      toast.success("Finance & payroll rules updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Late fees card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-sm shadow-amber-500/20">
            <CalendarClock size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Late-Fee Rules</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Applied during fee collection when a voucher is past its due date
            </p>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Grace Days</Label>
            <div className="relative">
              <CalendarClock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                inputMode="numeric"
                value={form.graceDays}
                onChange={(e) => handleNumber("graceDays", e.target.value, { max: 60 })}
                className="h-12 pl-11 bg-slate-50 border-slate-200 rounded-xl font-black text-slate-700"
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium pt-1">
              Days after due date before fines start. <b>0</b> = fine starts the next day.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Default Fine / Day</Label>
            <div className="relative">
              <Coins size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                inputMode="decimal"
                value={form.defaultLateFinePerDay}
                onChange={(e) => handleNumber("defaultLateFinePerDay", e.target.value, { max: 10000, allowDecimal: true })}
                className="h-12 pl-11 bg-slate-50 border-slate-200 rounded-xl font-black text-slate-700"
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium pt-1">
              Fallback fine in Rs/day. Per-class overrides on Fee Structure still win when set.
            </p>
          </div>

          <div className="md:col-span-2 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
            <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
              <b>Example:</b> with grace = 5 and fine = Rs. 50/day, a voucher due on the 1st starts accruing
              fine on the 7th — Rs. 50 on day 7, Rs. 100 on day 8, and so on.
            </p>
          </div>
        </div>
      </div>

      {/* Staff absence card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-sm shadow-rose-500/20">
            <Briefcase size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Staff Absence Deduction</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              How per-day pay is computed from monthly salary on the Salary screen
            </p>
          </div>
        </div>

        <div className="p-8 space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Working-Days Divisor
            </Label>
            <Input
              inputMode="numeric"
              value={form.absenceWorkingDaysDivisor}
              onChange={(e) => handleNumber("absenceWorkingDaysDivisor", e.target.value, { max: 31 })}
              className="h-12 bg-slate-50 border-slate-200 rounded-xl font-black text-slate-700"
            />
            <p className="text-[11px] text-slate-400 font-medium pt-1">
              Per-day rate = monthly salary ÷ this number. Use <b>30</b> for calendar days,
              <b> 26</b> for working days only, or anything in between.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
            <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              <b>Example:</b> for a Rs. 30,000 salary with divisor = {form.absenceWorkingDaysDivisor || 30},
              one absent day deducts <b>Rs. {Math.round(30000 / Math.max(1, form.absenceWorkingDaysDivisor || 30)).toLocaleString("en-PK")}</b>.
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
