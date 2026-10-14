import { useState, useEffect, useCallback } from "react";
import {
  Hash,
  Save,
  Loader2,
  IdCard,
  UserSquare,
  RotateCcw,
  AlertTriangle,
  History,
  ArrowRight,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/context/SettingsContext";
import { useStudents } from "@/context/StudentContext";
import { useNumericInput } from "@/hooks/useNumericInput";
import { settingsClient } from "@/services/settingsService";
import { formatRegNumber, formatRollNumber } from "@/lib/formatStudentNumber";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function StudentsTab() {
  const { settings, updateSettings } = useSettings();
  const { students, refreshStudents } = useStudents();
  const { sanitize } = useNumericInput();

  const [form, setForm] = useState({
    regNumberPrefix: "",
    regNumberPadding: 0,
    rollNumberPrefix: "",
    rollNumberPadding: 0,
  });
  const [saving, setSaving] = useState(false);

  // Sequence state — driven by /settings/student-sequences. Stays separate
  // from the prefix/padding form because it's not a regular settings field.
  const [sequences, setSequences] = useState({ regNumberNext: 1, rollNumberNext: 1 });
  const [loadingSequences, setLoadingSequences] = useState(true);
  // Stored as numbers (0 = empty) so the useNumericInput sanitize hook
  // can stay the source of truth for both fields.
  const [regStart, setRegStart] = useState(0);
  const [rollStart, setRollStart] = useState(0);
  const [confirmAction, setConfirmAction] = useState(null); // { kind: 'reg'|'roll', value: number }
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    setForm({
      regNumberPrefix: settings.regNumberPrefix || "",
      regNumberPadding: Number(settings.regNumberPadding || 0),
      rollNumberPrefix: settings.rollNumberPrefix || "",
      rollNumberPadding: Number(settings.rollNumberPadding || 0),
    });
  }, [settings]);

  const fetchSequences = useCallback(async () => {
    setLoadingSequences(true);
    try {
      const data = await settingsClient.getStudentSequences();
      setSequences(data);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load sequences");
    } finally {
      setLoadingSequences(false);
    }
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const dirty =
    form.regNumberPrefix !== (settings.regNumberPrefix || "") ||
    Number(form.regNumberPadding) !== Number(settings.regNumberPadding || 0) ||
    form.rollNumberPrefix !== (settings.rollNumberPrefix || "") ||
    Number(form.rollNumberPadding) !== Number(settings.rollNumberPadding || 0);

  const regPreview = formatRegNumber(sequences.regNumberNext, {
    regNumberPrefix: form.regNumberPrefix,
    regNumberPadding: form.regNumberPadding,
  });
  const rollPreview = formatRollNumber(sequences.rollNumberNext, {
    rollNumberPrefix: form.rollNumberPrefix,
    rollNumberPadding: form.rollNumberPadding,
  });

  const lastStudent = students[0]; // StudentContext returns desc by createdAt
  const lastRegFormatted = lastStudent
    ? formatRegNumber(lastStudent.regNumber, {
        regNumberPrefix: form.regNumberPrefix,
        regNumberPadding: form.regNumberPadding,
      })
    : null;
  const lastRollFormatted = lastStudent
    ? formatRollNumber(lastStudent.rollNumber, {
        rollNumberPrefix: form.rollNumberPrefix,
        rollNumberPadding: form.rollNumberPadding,
      })
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dirty) return;

    if (form.regNumberPadding < 0 || form.regNumberPadding > 10) {
      return toast.error("Reg# padding must be between 0 and 10");
    }
    if (form.rollNumberPadding < 0 || form.rollNumberPadding > 10) {
      return toast.error("Roll# padding must be between 0 and 10");
    }

    setSaving(true);
    try {
      await updateSettings({
        regNumberPrefix: form.regNumberPrefix.trim(),
        regNumberPadding: Number(form.regNumberPadding),
        rollNumberPrefix: form.rollNumberPrefix.trim(),
        rollNumberPadding: Number(form.rollNumberPadding),
      });
      toast.success("Student numbering format updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const promptRestart = (kind) => {
    const value = kind === "reg" ? regStart : rollStart;
    if (!Number.isInteger(value) || value < 1) {
      return toast.error("Enter a positive whole number to restart from");
    }
    setConfirmAction({ kind, value });
  };

  const handleRestart = async () => {
    if (!confirmAction) return;
    setRestarting(true);
    try {
      if (confirmAction.kind === "reg") {
        await settingsClient.restartRegSequence(confirmAction.value);
        setRegStart(0);
        toast.success(`Next registration number will be ${confirmAction.value}`);
      } else {
        const res = await settingsClient.restartRollSequence(confirmAction.value);
        setRollStart(0);
        if (res.warning) toast.warning(res.warning);
        else toast.success(`Next roll number will be ${confirmAction.value}`);
      }
      await Promise.allSettled([fetchSequences(), refreshStudents?.()]);
      setConfirmAction(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to restart sequence");
    } finally {
      setRestarting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card
        title="Registration Number"
        icon={IdCard}
        accentClass="bg-emerald-600 shadow-emerald-600/20"
        prefix={form.regNumberPrefix}
        onPrefixChange={(v) => setForm((f) => ({ ...f, regNumberPrefix: v.slice(0, 10) }))}
        padding={form.regNumberPadding}
        onPaddingChange={(v) => setForm((f) => ({ ...f, regNumberPadding: v }))}
        sanitize={sanitize}
        nextValue={sequences.regNumberNext}
        nextPreview={regPreview}
        lastValue={lastStudent?.regNumber}
        lastPreview={lastRegFormatted}
        loadingSequences={loadingSequences}
        restartValue={regStart}
        onRestartChange={setRegStart}
        onRestartClick={() => promptRestart("reg")}
        restartHint="Must be greater than the highest existing reg# (uniqueness)."
      />

      <Card
        title="Roll Number"
        icon={UserSquare}
        accentClass="bg-blue-600 shadow-blue-600/20"
        prefix={form.rollNumberPrefix}
        onPrefixChange={(v) => setForm((f) => ({ ...f, rollNumberPrefix: v.slice(0, 10) }))}
        padding={form.rollNumberPadding}
        onPaddingChange={(v) => setForm((f) => ({ ...f, rollNumberPadding: v }))}
        sanitize={sanitize}
        nextValue={sequences.rollNumberNext}
        nextPreview={rollPreview}
        lastValue={lastStudent?.rollNumber}
        lastPreview={lastRollFormatted}
        loadingSequences={loadingSequences}
        restartValue={rollStart}
        onRestartChange={setRollStart}
        onRestartClick={() => promptRestart("roll")}
        restartHint="Roll numbers are not unique — restarting below the current max will create duplicates."
      />

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 px-8 py-5 flex justify-end">
        <Button
          type="submit"
          disabled={!dirty || saving}
          className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Format Changes
        </Button>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Restart {confirmAction?.kind === "reg" ? "registration" : "roll"} numbering?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The next {confirmAction?.kind === "reg" ? "registration" : "roll"} number issued will be{" "}
              <b>{confirmAction?.value}</b>. Existing students' numbers are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restarting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestart}
              disabled={restarting}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
            >
              {restarting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Restart sequence
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

function Card({
  title, icon: Icon, accentClass,
  prefix, onPrefixChange,
  padding, onPaddingChange,
  nextValue, nextPreview, lastValue, lastPreview,
  loadingSequences,
  restartValue, onRestartChange, onRestartClick,
  restartHint,
  sanitize,
}) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center gap-4">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm", accentClass)}>
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">{title}</h3>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
            Prefix, padding, and starting position for newly issued numbers
          </p>
        </div>
      </div>

      {/* Last ↔ Upcoming preview */}
      <div className="px-8 pt-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-4 md:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2 flex items-center gap-2">
                <History size={11} /> Last Issued
              </p>
              <h4 className="text-3xl font-black tracking-tight break-all">
                {lastPreview || "—"}
              </h4>
              <p className="text-[11px] font-medium text-slate-400 mt-1">
                {lastValue ? `Raw value: ${lastValue}` : "No students registered yet"}
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <ArrowRight size={24} className="text-white/30" />
            </div>
            <div className="md:text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300 mb-2 flex items-center gap-2 md:justify-end">
                <Icon size={11} /> Next To Issue
              </p>
              <h4 className="text-3xl font-black tracking-tight break-all">
                {loadingSequences ? "…" : nextPreview}
              </h4>
              <p className="text-[11px] font-medium text-slate-400 mt-1">
                {loadingSequences ? "Loading…" : `Raw value: ${nextValue}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prefix (optional)</Label>
          <div className="relative">
            <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              value={prefix}
              onChange={(e) => onPrefixChange(e.target.value)}
              placeholder="e.g. STU-"
              className="h-12 pl-11 bg-slate-50 border-slate-200 rounded-xl font-black text-slate-700"
            />
          </div>
          <p className="text-[11px] text-slate-400 font-medium pt-1">Up to 10 characters. Leave blank for no prefix.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Padding (digits)</Label>
          <Input
            type="text"
            inputMode="numeric"
            value={padding}
            onChange={(e) => {
              const v = sanitize(e.target.value, 10);
              if (v !== null) onPaddingChange(v);
            }}
            className="h-12 bg-slate-50 border-slate-200 rounded-xl font-black text-slate-700"
          />
          <p className="text-[11px] text-slate-400 font-medium pt-1">
            0 → no padding. 4 → 0001, 6 → 000001. Max 10.
          </p>
        </div>
      </div>

      <div className="px-8 pb-8 -mt-2">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <RotateCcw size={16} className="text-amber-600" />
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-700">Restart Sequence</span>
          </div>
          <p className="text-[11px] font-medium text-amber-800 leading-relaxed">
            Skip ahead so the next number issued starts from a value you choose. {restartHint}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="text"
              inputMode="numeric"
              value={restartValue === 0 ? "" : restartValue}
              onChange={(e) => {
                // 2 billion ceiling matches the server-side restartSequenceSchema.
                const v = sanitize(e.target.value, 2_000_000_000);
                if (v !== null) onRestartChange(v);
              }}
              placeholder="e.g. 1001"
              className="h-11 bg-white border-amber-200 rounded-xl font-bold text-slate-700 sm:flex-1"
            />
            <Button
              type="button"
              onClick={onRestartClick}
              disabled={!restartValue || loadingSequences}
              className="h-11 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
