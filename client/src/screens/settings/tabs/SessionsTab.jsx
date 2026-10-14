import { useState } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  LogOut,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Clock,
  Globe,
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
import { sessionsClient } from "@/services/authService";
import { parseUserAgent, relativeTime } from "@/lib/parseUserAgent";
import { useSettings } from "@/context/SettingsContext";
import { useAdminSettings } from "@/context/AdminSettingsContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const deviceIcon = (os) => {
  if (os === "iOS" || os === "Android") {
    // No good way to distinguish phone from tablet without UA tokens we don't
    // already parse. Phone is the common case, so default to it.
    return Smartphone;
  }
  return Monitor;
};

export default function SessionsTab() {
  const { formatDate } = useSettings();
  const { sessions, loadingSessions: loading, refreshSessions, setSessions } = useAdminSettings();
  const [busyId, setBusyId] = useState(null);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  const handleRevoke = async (id) => {
    setBusyId(id);
    try {
      await sessionsClient.revoke(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Device signed out");
    } catch (e) {
      toast.error(e?.message || "Failed to sign out device");
    } finally {
      setBusyId(null);
    }
  };

  const handleRevokeAll = async () => {
    setRevokingAll(true);
    try {
      const { revokedCount } = await sessionsClient.revokeOthers();
      // Keep only the current session.
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      toast.success(
        revokedCount > 0
          ? `Signed out ${revokedCount} other device${revokedCount === 1 ? "" : "s"}`
          : "No other devices to sign out"
      );
      setConfirmRevokeAll(false);
    } catch (e) {
      toast.error(e?.message || "Failed to sign out other devices");
    } finally {
      setRevokingAll(false);
    }
  };

  const otherCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="space-y-8">
      {/* Header card with global action */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-sm shadow-rose-500/20">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Active Sessions</h3>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Devices currently signed in to your account
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={refreshSessions}
              disabled={loading}
              className="h-11 rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              type="button"
              onClick={() => setConfirmRevokeAll(true)}
              disabled={loading || otherCount === 0}
              className="h-11 rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out other devices {otherCount > 0 && `(${otherCount})`}
            </Button>
          </div>
        </div>

        {loading && sessions.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300 mx-auto" />
            <p className="text-xs font-medium text-slate-400 mt-3">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold italic">
            No active sessions found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((s) => {
              const { browser, os } = parseUserAgent(s.userAgent);
              const Icon = deviceIcon(os);
              const isBusy = busyId === s.id;

              return (
                <div
                  key={s.id}
                  className={cn(
                    "px-8 py-6 flex flex-col md:flex-row md:items-center gap-5",
                    s.isCurrent && "bg-emerald-50/40"
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      s.isCurrent ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20" : "bg-slate-100 text-slate-600"
                    )}
                  >
                    <Icon size={22} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className="text-base font-black text-slate-900">
                        {browser} <span className="text-slate-400 font-bold">·</span> {os}
                      </h4>
                      {s.isCurrent && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                          This device
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[11px] font-medium text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="shrink-0" />
                        <span>Last active {relativeTime(s.lastUsedAt)}</span>
                      </div>
                      {s.ipAddress && (
                        <div className="flex items-center gap-1.5">
                          <Globe size={12} className="shrink-0" />
                          <span>IP {s.ipAddress}</span>
                        </div>
                      )}
                      <div>
                        Signed in {formatDate(s.createdAt)}
                      </div>
                    </div>
                  </div>

                  {!s.isCurrent && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleRevoke(s.id)}
                      disabled={isBusy}
                      className="h-10 rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50 shrink-0"
                    >
                      {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                      Sign out
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmRevokeAll} onOpenChange={setConfirmRevokeAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out other devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign out every device except this one. Anyone using your account elsewhere
              will need to sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAll}
              disabled={revokingAll}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold"
            >
              {revokingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign out other devices
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
