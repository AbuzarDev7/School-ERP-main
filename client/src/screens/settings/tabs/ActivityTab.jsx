import { useState, useMemo } from "react";
import {
  Activity,
  RefreshCw,
  LogIn,
  LogOut,
  UserPlus,
  Pencil,
  Trash2,
  Ticket,
  Users as UsersIcon,
  ShieldCheck,
  Wallet,
  Settings as SettingsIcon,
  Loader2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { relativeTime } from "@/lib/parseUserAgent";
import { useSettings } from "@/context/SettingsContext";
import { useAdminSettings } from "@/context/AdminSettingsContext";
import { cn } from "@/lib/utils";

const ACTION_META = {
  LOGIN:             { icon: LogIn,        label: "Signed in",          color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  LOGOUT:            { icon: LogOut,       label: "Signed out",         color: "text-slate-700 bg-slate-50 border-slate-100" },
  STUDENT_CREATED:   { icon: UserPlus,     label: "Student registered", color: "text-blue-700 bg-blue-50 border-blue-100" },
  STUDENT_UPDATED:   { icon: Pencil,       label: "Student edited",     color: "text-blue-700 bg-blue-50 border-blue-100" },
  STUDENT_DELETED:   { icon: Trash2,       label: "Student deleted",    color: "text-rose-700 bg-rose-50 border-rose-100" },
  VOUCHER_CREATED:   { icon: Ticket,       label: "Voucher created",    color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  VOUCHER_UPDATED:   { icon: Pencil,       label: "Voucher edited",     color: "text-blue-700 bg-blue-50 border-blue-100" },
  VOUCHER_DELETED:   { icon: Trash2,       label: "Voucher deleted",    color: "text-rose-700 bg-rose-50 border-rose-100" },
  PAYMENT_COLLECTED: { icon: Wallet,       label: "Payment collected",  color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  SETTINGS_UPDATED:  { icon: SettingsIcon, label: "Settings changed",   color: "text-amber-700 bg-amber-50 border-amber-100" },
  USER_CREATED:      { icon: UserPlus,     label: "User invited",       color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  USER_UPDATED:      { icon: Pencil,       label: "User edited",        color: "text-blue-700 bg-blue-50 border-blue-100" },
  USER_DELETED:      { icon: Trash2,       label: "User deleted",       color: "text-rose-700 bg-rose-50 border-rose-100" },
  ROLE_CREATED:      { icon: ShieldCheck,  label: "Role created",       color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  ROLE_UPDATED:      { icon: ShieldCheck,  label: "Role edited",        color: "text-blue-700 bg-blue-50 border-blue-100" },
  ROLE_DELETED:      { icon: ShieldCheck,  label: "Role deleted",       color: "text-rose-700 bg-rose-50 border-rose-100" },
};

const FILTER_GROUPS = [
  { value: "all", label: "All activity" },
  { value: "auth", label: "Sign in / out", actions: ["LOGIN", "LOGOUT"] },
  { value: "students", label: "Students", actions: ["STUDENT_CREATED", "STUDENT_UPDATED", "STUDENT_DELETED"] },
  { value: "vouchers", label: "Vouchers", actions: ["VOUCHER_CREATED", "VOUCHER_UPDATED", "VOUCHER_DELETED", "PAYMENT_COLLECTED"] },
  { value: "users", label: "Users & roles", actions: ["USER_CREATED", "USER_UPDATED", "USER_DELETED", "ROLE_CREATED", "ROLE_UPDATED", "ROLE_DELETED"] },
  { value: "settings", label: "Settings", actions: ["SETTINGS_UPDATED"] },
];

export default function ActivityTab() {
  const { formatDate } = useSettings();
  const { activityLogs: logs, loadingActivity: loading, refreshActivity, activityLimit } = useAdminSettings();

  const [filter, setFilter] = useState("all");

  const visibleLogs = useMemo(() => {
    if (filter === "all") return logs;
    const group = FILTER_GROUPS.find((g) => g.value === filter);
    if (!group?.actions) return logs;
    const set = new Set(group.actions);
    return logs.filter((l) => set.has(l.action));
  }, [logs, filter]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-sm shadow-amber-500/20">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Activity Log</h3>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Audit trail of significant actions across the system
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-10 w-44 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTER_GROUPS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Select value={String(activityLimit)} onValueChange={(v) => refreshActivity(Number(v))}>
              <SelectTrigger className="h-10 w-28 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[50, 100, 250, 500].map((n) => <SelectItem key={n} value={String(n)}>{n} rows</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={() => refreshActivity()}
              disabled={loading}
              className="h-10 rounded-xl font-bold border-slate-200"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {loading && logs.length === 0 ? (
          <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300 mx-auto" /></div>
        ) : visibleLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold italic">
            No activity matches your filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleLogs.map((log) => {
              const meta = ACTION_META[log.action] || { icon: Activity, label: log.action, color: "text-slate-700 bg-slate-50 border-slate-100" };
              const Icon = meta.icon;
              return (
                <div key={log.id} className="px-8 py-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", meta.color)}>
                    <Icon size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-900">{meta.label}</span>
                      {log.entityLabel && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-sm font-bold text-slate-700 truncate">{log.entityLabel}</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                      <b>{log.actorName || "Unknown"}</b>
                      {log.actorEmail && <span className="text-slate-400"> · {log.actorEmail}</span>}
                      {log.ipAddress && <span className="text-slate-400"> · IP {log.ipAddress}</span>}
                    </p>
                  </div>

                  <div className="text-[11px] font-bold text-slate-400 shrink-0 text-right">
                    <div>{relativeTime(log.createdAt)}</div>
                    <div className="text-slate-300 font-medium">{formatDate(log.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
