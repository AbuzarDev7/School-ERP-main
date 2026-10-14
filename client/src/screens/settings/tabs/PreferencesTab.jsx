import { useState, useEffect } from "react";
import { CalendarDays, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/context/SettingsContext";
import { formatDate } from "@/lib/formatDate";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FORMAT_OPTIONS = [
  { value: "DD/MM/YYYY", label: "Day · Month · Year", region: "Pakistan, UK, EU" },
  { value: "MM/DD/YYYY", label: "Month · Day · Year", region: "United States" },
  { value: "YYYY-MM-DD", label: "ISO sortable", region: "International standard" },
  { value: "DD MMM YYYY", label: "Day Month Year", region: "Long form, easy reading" },
];

export default function PreferencesTab() {
  const { settings, updateSettings } = useSettings();

  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDateFormat(settings.dateFormat || "DD/MM/YYYY");
  }, [settings.dateFormat]);

  const dirty = dateFormat !== (settings.dateFormat || "DD/MM/YYYY");
  const sample = new Date();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    try {
      await updateSettings({ dateFormat });
      toast.success("Preferences updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/20">
            <CalendarDays size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Date Format</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              How dates appear across screens, vouchers, and reports
            </p>
          </div>
        </div>

        <div className="p-8 space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Choose a format</Label>
          {FORMAT_OPTIONS.map((opt) => {
            const active = dateFormat === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => setDateFormat(opt.value)}
                className={cn(
                  "w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4",
                  active
                    ? "border-emerald-500 bg-emerald-50 shadow-sm"
                    : "border-slate-100 bg-slate-50 hover:border-slate-200"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className={cn("text-base font-black", active ? "text-emerald-700" : "text-slate-700")}>
                      {opt.label}
                    </span>
                    {active && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">{opt.region}</p>
                </div>
                <div
                  className={cn(
                    "px-4 py-3 rounded-xl font-mono text-sm font-black shrink-0",
                    active ? "bg-emerald-600 text-white" : "bg-white text-slate-700 border border-slate-200"
                  )}
                >
                  {formatDate(sample, opt.value)}
                </div>
              </button>
            );
          })}
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
