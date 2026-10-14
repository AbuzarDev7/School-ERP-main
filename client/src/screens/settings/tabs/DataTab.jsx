import { useRef, useState } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  Users,
  Ticket,
  Wallet,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Loader2,
  Database,
  ShieldAlert,
  CheckCircle2,
  CircleAlert,
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
import { dataClient } from "@/services/dataService";
import { useSettings } from "@/context/SettingsContext";
import { useVouchers } from "@/context/VoucherContext";
import { useStudents } from "@/context/StudentContext";
import { toast } from "sonner";

const EXPORT_TYPES = [
  {
    type: "students",
    label: "Students",
    description: "Full registry: contacts, parents, discounts",
    icon: Users,
    accent: "blue",
  },
  {
    type: "vouchers",
    label: "Fee Vouchers",
    description: "Every voucher with student, status, and amount",
    icon: Ticket,
    accent: "emerald",
  },
  {
    type: "payments",
    label: "Payments (Cashbook)",
    description: "All money in/out across payment methods",
    icon: Wallet,
    accent: "amber",
  },
];

const ACCENT_CLASSES = {
  blue: "bg-blue-600 shadow-blue-600/20",
  emerald: "bg-emerald-600 shadow-emerald-600/20",
  amber: "bg-amber-500 shadow-amber-500/20",
};

export default function DataTab() {
  const { settings } = useSettings();
  const { refreshVouchers } = useVouchers();
  const { refreshStudents } = useStudents();

  const [busy, setBusy] = useState({}); // keyed by `${type}:${format}`

  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

  const [wipeOpen, setWipeOpen] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState("");
  const [wiping, setWiping] = useState(false);

  // One slot per resource so each row can independently be busy / show its
  // last result, without the others getting reset. Result shape:
  //   { inserted, skipped: [...], errors: [...], total }
  const [importBusy, setImportBusy] = useState({}); // { students: true, ... }
  const [importResults, setImportResults] = useState({}); // { students: { ... } }
  // Hidden <input type="file"> refs so the Button can drive a native picker.
  const fileInputs = {
    students: useRef(null),
    vouchers: useRef(null),
    payments: useRef(null),
  };

  const schoolName = settings?.schoolName || "My School";

  const handlePickImportFile = (type) => {
    fileInputs[type].current?.click();
  };

  // Reads the selected JSON file, parses it, and POSTs to the matching
  // import endpoint. Updates per-row result so the admin can see exactly
  // what was inserted vs. skipped without leaving the page.
  const handleImportFile = async (type, file) => {
    if (!file) return;

    setImportBusy((b) => ({ ...b, [type]: true }));
    try {
      const text = await file.text();
      let rows;
      try {
        rows = JSON.parse(text);
      } catch {
        throw new Error("Selected file isn't valid JSON");
      }
      if (!Array.isArray(rows)) {
        throw new Error("Expected a JSON array at the top level (the format the Export buttons produce)");
      }

      let result;
      if (type === "students") result = await dataClient.importStudents(rows);
      else if (type === "vouchers") result = await dataClient.importVouchers(rows);
      else if (type === "payments") result = await dataClient.importPayments(rows);

      setImportResults((r) => ({ ...r, [type]: result }));

      // Sync local contexts so the rest of the app reflects what we just
      // restored without a manual refresh.
      if (type === "students") await refreshStudents?.();
      if (type === "vouchers" || type === "students") await refreshVouchers?.();

      const skipped = result.skipped?.length || 0;
      const errors = result.errors?.length || 0;
      const inserted = result.inserted || 0;
      const summary = `${inserted} inserted${skipped ? `, ${skipped} skipped` : ""}${errors ? `, ${errors} error(s)` : ""}`;
      if (errors > 0) toast.warning(`Imported with issues — ${summary}`);
      else if (inserted === 0) toast.warning(`No new rows imported — ${summary}`);
      else toast.success(`${type[0].toUpperCase() + type.slice(1)} imported — ${summary}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Import failed");
    } finally {
      setImportBusy((b) => ({ ...b, [type]: false }));
    }
  };

  const handleExport = async (type, format) => {
    const key = `${type}:${format}`;
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      await dataClient.exportData({ type, format });
      toast.success(`${type} exported as ${format.toUpperCase()}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Export failed");
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const { vouchersDeleted } = await dataClient.resetAcademicYear(resetConfirm);
      toast.success(`Reset complete. ${vouchersDeleted} voucher(s) cleared.`);
      setResetOpen(false);
      setResetConfirm("");
      // Refresh affected contexts so the UI reflects the wipe immediately.
      await refreshVouchers?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const handleWipe = async () => {
    setWiping(true);
    try {
      await dataClient.wipeAllData(wipeConfirm);
      toast.success("All operational data wiped");
      setWipeOpen(false);
      setWipeConfirm("");
      // Re-fetch the most visible contexts. The user is going to land on a
      // mostly-empty UI either way, but this avoids stale ghost rows.
      await Promise.allSettled([refreshVouchers?.(), refreshStudents?.()]);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Wipe failed");
    } finally {
      setWiping(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Export section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20">
            <Database size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Export Data</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Download your records for backup or external analysis
            </p>
          </div>
        </div>

        <div className="p-8 space-y-4">
          {EXPORT_TYPES.map((opt) => {
            const Icon = opt.icon;
            const csvKey = `${opt.type}:csv`;
            const jsonKey = `${opt.type}:json`;
            return (
              <div
                key={opt.type}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm ${ACCENT_CLASSES[opt.accent]}`}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{opt.label}</h4>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">{opt.description}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleExport(opt.type, "csv")}
                    disabled={busy[csvKey] || busy[jsonKey]}
                    className="h-10 rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-white"
                  >
                    {busy[csvKey] ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                    )}
                    CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleExport(opt.type, "json")}
                    disabled={busy[csvKey] || busy[jsonKey]}
                    className="h-10 rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-white"
                  >
                    {busy[jsonKey] ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileJson className="mr-2 h-4 w-4" />
                    )}
                    JSON
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <Download size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
              <b>Tip:</b> Export <b>before</b> using the danger-zone actions below. The danger-zone
              operations are <i>irreversible</i> — these exports are your only recovery path.
            </p>
          </div>
        </div>
      </div>

      {/* Import section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/20">
            <Upload size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Import Data</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Restore from a previous JSON export. Rows with existing ids or unique keys are skipped automatically.
            </p>
          </div>
        </div>

        <div className="p-8 space-y-4">
          {EXPORT_TYPES.map((opt) => {
            const Icon = opt.icon;
            const busy = !!importBusy[opt.type];
            const result = importResults[opt.type];
            return (
              <div
                key={opt.type}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm ${ACCENT_CLASSES[opt.accent]}`}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-slate-900">{opt.label}</h4>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">{opt.description}</p>
                    {result && (
                      <p
                        className={`text-[11px] font-bold mt-1 flex items-center gap-1.5 ${
                          result.errors.length > 0 ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        {result.errors.length > 0 ? (
                          <CircleAlert size={12} />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        <span>
                          {result.inserted} inserted
                          {result.skipped.length > 0 && ` · ${result.skipped.length} skipped`}
                          {result.errors.length > 0 && ` · ${result.errors.length} error(s)`}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <input
                    ref={fileInputs[opt.type]}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = ""; // allow picking the same file again later
                      handleImportFile(opt.type, file);
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => handlePickImportFile(opt.type)}
                    disabled={busy}
                    className="h-10 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Import JSON
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
            <CircleAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-800 font-medium leading-relaxed">
              <p className="mb-1">
                <b>Order matters:</b> import <b>Students</b> first, then <b>Vouchers</b>, then <b>Payments</b>.
                Vouchers reference student ids — they'll be skipped if the student doesn't exist yet.
              </p>
              <p>
                Use the JSON files produced by the Export buttons above. Duplicate ids and unique-key collisions
                are silently skipped (so re-running the same file is safe).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-3xl shadow-sm border-2 border-rose-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-rose-200 bg-rose-50/50 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-sm shadow-rose-500/20">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-rose-900 tracking-tight">Danger Zone</h3>
            <p className="text-[11px] font-medium text-rose-700 mt-0.5">
              These actions cannot be undone — proceed with care
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Reset academic year */}
          <div className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <RotateCcw size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Reset Academic Year</h4>
                <p className="text-[12px] font-medium text-slate-500 mt-1 max-w-md">
                  Deletes <b>every fee voucher</b> and restarts voucher numbering at <b>1</b>.
                  Students, fee structure, and the cashbook ledger remain untouched.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetOpen(true)}
              className="h-11 rounded-xl font-bold border-amber-300 text-amber-700 hover:bg-amber-50 shrink-0"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Year
            </Button>
          </div>

          {/* Wipe all data */}
          <div className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Wipe All Data</h4>
                <p className="text-[12px] font-medium text-slate-500 mt-1 max-w-md">
                  Clears <b>everything</b> — students, vouchers, fees, expenses, payments, products,
                  invoices, staff. Your user account and Settings are preserved.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setWipeOpen(true)}
              className="h-11 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 shrink-0"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Wipe Everything
            </Button>
          </div>
        </div>
      </div>

      {/* Reset confirmation dialog */}
      <AlertDialog open={resetOpen} onOpenChange={(o) => { setResetOpen(o); if (!o) setResetConfirm(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Reset Academic Year?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2">
              <span className="block">This will permanently delete every voucher in the system and reset voucher numbering.</span>
              <span className="block text-amber-700 font-medium">
                Recommendation: export <b>vouchers</b> as CSV before continuing.
              </span>
              <span className="block pt-3">
                Type <b className="font-mono text-slate-900">{schoolName}</b> below to confirm:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Confirmation</Label>
            <Input
              autoFocus
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder={schoolName}
              className="h-11 mt-2 bg-slate-50 border-slate-200 rounded-xl font-bold"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={resetting || resetConfirm.trim() !== schoolName}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reset Year
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Wipe confirmation dialog */}
      <AlertDialog open={wipeOpen} onOpenChange={(o) => { setWipeOpen(o); if (!o) setWipeConfirm(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Wipe All Data?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2">
              <span className="block text-rose-700 font-bold">This is irreversible.</span>
              <span className="block">Every student, voucher, expense, payment, invoice, product, and staff record will be deleted. User accounts and Settings remain.</span>
              <span className="block pt-3">
                Type <b className="font-mono text-slate-900">{schoolName}</b> below to confirm:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Confirmation</Label>
            <Input
              autoFocus
              value={wipeConfirm}
              onChange={(e) => setWipeConfirm(e.target.value)}
              placeholder={schoolName}
              className="h-11 mt-2 bg-slate-50 border-rose-200 rounded-xl font-bold"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={wiping}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWipe}
              disabled={wiping || wipeConfirm.trim() !== schoolName}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {wiping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Wipe Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
