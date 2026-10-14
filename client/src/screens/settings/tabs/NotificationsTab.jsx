import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Mail,
  MessageSquare,
  Phone,
  Save,
  Loader2,
  Send,
  RefreshCw,
  CircleCheck,
  CircleX,
  CircleAlert,
  Bell,
  Pencil,
  AtSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/context/SettingsContext";
import { notificationsClient } from "@/services/notificationsService";
import { relativeTime } from "@/lib/parseUserAgent";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EVENT_LABELS = {
  VOUCHER_CREATED: "Voucher Generated",
  PAYMENT_RECEIVED: "Payment Received",
  DUES_REMINDER: "Dues Reminder",
};

const EVENT_HINTS = {
  VOUCHER_CREATED: "Auto-fires when a fee voucher is created (single or bulk).",
  PAYMENT_RECEIVED: "Reserved — not auto-triggered yet. Edit the template ahead of enabling.",
  DUES_REMINDER: "Reserved — used by manual / scheduled reminder flows.",
};

const CHANNEL_META = {
  EMAIL: { label: "Email", icon: Mail, accent: "bg-blue-600 text-white shadow-blue-600/20" },
  SMS: { label: "SMS", icon: MessageSquare, accent: "bg-emerald-600 text-white shadow-emerald-600/20" },
  WHATSAPP: { label: "WhatsApp", icon: Phone, accent: "bg-green-600 text-white shadow-green-600/20" },
};

const PLACEHOLDERS = [
  { token: "{{schoolName}}", desc: "Your school name from Settings" },
  { token: "{{studentName}}", desc: "First + last name" },
  { token: "{{class}}", desc: "Class name" },
  { token: "{{voucherNumber}}", desc: "Voucher number" },
  { token: "{{month}}", desc: "Voucher month label" },
  { token: "{{totalPayable}}", desc: "Total amount due (Rs.)" },
  { token: "{{paidAmount}}", desc: "Amount already paid" },
  { token: "{{balance}}", desc: "Outstanding balance" },
  { token: "{{dueDate}}", desc: "Due date in your chosen format" },
];

const STATUS_META = {
  SENT: { label: "Sent", icon: CircleCheck, color: "text-emerald-700 bg-emerald-50 border-emerald-100" },
  FAILED: { label: "Failed", icon: CircleX, color: "text-rose-700 bg-rose-50 border-rose-100" },
  SKIPPED: { label: "Skipped", icon: CircleAlert, color: "text-amber-700 bg-amber-50 border-amber-100" },
  QUEUED: { label: "Queued", icon: CircleAlert, color: "text-slate-700 bg-slate-50 border-slate-100" },
};

export default function NotificationsTab() {
  const { settings, updateSettings } = useSettings();

  const [channelForm, setChannelForm] = useState({
    notificationsEmailEnabled: false,
    notificationsSmsEnabled: false,
    notificationsWhatsappEnabled: false,
    notificationsEmailFrom: "",
    notificationsSmsFrom: "",
    notificationsWhatsappFrom: "",
  });
  const [savingChannels, setSavingChannels] = useState(false);

  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const [editing, setEditing] = useState(null); // template object
  const [editForm, setEditForm] = useState({ subject: "", body: "", enabled: true });
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [test, setTest] = useState({ event: "VOUCHER_CREATED", channel: "EMAIL", recipient: "" });
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    setChannelForm({
      notificationsEmailEnabled: !!settings.notificationsEmailEnabled,
      notificationsSmsEnabled: !!settings.notificationsSmsEnabled,
      notificationsWhatsappEnabled: !!settings.notificationsWhatsappEnabled,
      notificationsEmailFrom: settings.notificationsEmailFrom || "",
      notificationsSmsFrom: settings.notificationsSmsFrom || "",
      notificationsWhatsappFrom: settings.notificationsWhatsappFrom || "",
    });
  }, [settings]);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      setTemplates(await notificationsClient.listTemplates());
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load templates");
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      setLogs(await notificationsClient.listLogs(50));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load logs");
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchLogs();
  }, [fetchTemplates, fetchLogs]);

  const channelDirty = useMemo(() => {
    return (
      channelForm.notificationsEmailEnabled !== !!settings.notificationsEmailEnabled ||
      channelForm.notificationsSmsEnabled !== !!settings.notificationsSmsEnabled ||
      channelForm.notificationsWhatsappEnabled !== !!settings.notificationsWhatsappEnabled ||
      channelForm.notificationsEmailFrom !== (settings.notificationsEmailFrom || "") ||
      channelForm.notificationsSmsFrom !== (settings.notificationsSmsFrom || "") ||
      channelForm.notificationsWhatsappFrom !== (settings.notificationsWhatsappFrom || "")
    );
  }, [channelForm, settings]);

  const handleSaveChannels = async (e) => {
    e.preventDefault();
    if (!channelDirty) return;
    setSavingChannels(true);
    try {
      await updateSettings({
        notificationsEmailEnabled: channelForm.notificationsEmailEnabled,
        notificationsSmsEnabled: channelForm.notificationsSmsEnabled,
        notificationsWhatsappEnabled: channelForm.notificationsWhatsappEnabled,
        notificationsEmailFrom: channelForm.notificationsEmailFrom.trim(),
        notificationsSmsFrom: channelForm.notificationsSmsFrom.trim(),
        notificationsWhatsappFrom: channelForm.notificationsWhatsappFrom.trim(),
      });
      toast.success("Notification channels updated");
    } catch (e2) {
      toast.error(e2?.response?.data?.message || e2?.message || "Failed to save channels");
    } finally {
      setSavingChannels(false);
    }
  };

  const openEditor = (tpl) => {
    setEditing(tpl);
    setEditForm({
      subject: tpl.subject || "",
      body: tpl.body || "",
      enabled: tpl.enabled,
    });
  };

  const handleSaveTemplate = async () => {
    if (!editing) return;
    if (!editForm.body.trim()) return toast.error("Body cannot be empty");

    setSavingTemplate(true);
    try {
      const updated = await notificationsClient.updateTemplate(editing.id, {
        subject: editForm.subject || null,
        body: editForm.body,
        enabled: editForm.enabled,
      });
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success("Template saved");
      setEditing(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSendTest = async (e) => {
    e.preventDefault();
    if (!test.recipient.trim()) return toast.error("Enter a recipient");

    setSendingTest(true);
    try {
      const log = await notificationsClient.sendTest({
        event: test.event,
        channel: test.channel,
        recipient: test.recipient.trim(),
      });
      const msg =
        log.status === "SENT" ? "Test sent" :
        log.status === "SKIPPED" ? `Skipped: ${log.errorMessage || "channel disabled"}` :
        `Failed: ${log.errorMessage || "unknown"}`;
      if (log.status === "SENT") toast.success(msg); else toast.warning(msg);
      fetchLogs();
    } catch (e2) {
      toast.error(e2?.response?.data?.message || e2?.message || "Test failed");
    } finally {
      setSendingTest(false);
    }
  };

  const groupedTemplates = useMemo(() => {
    const map = new Map();
    for (const t of templates) {
      if (!map.has(t.event)) map.set(t.event, []);
      map.get(t.event).push(t);
    }
    return Array.from(map.entries());
  }, [templates]);

  return (
    <div className="space-y-8">
      {/* Channel configuration */}
      <form
        onSubmit={handleSaveChannels}
        className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/20">
            <Bell size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Channels</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Toggle channels and set the sender identity for each
            </p>
          </div>
        </div>

        <div className="p-8 space-y-5">
          <ChannelRow
            channel="EMAIL"
            enabled={channelForm.notificationsEmailEnabled}
            onToggle={(v) => setChannelForm((f) => ({ ...f, notificationsEmailEnabled: v }))}
            from={channelForm.notificationsEmailFrom}
            onFromChange={(v) => setChannelForm((f) => ({ ...f, notificationsEmailFrom: v }))}
            placeholder="noreply@yourschool.com"
            hint='Verified "from" address from your Resend domain.'
          />
          <ChannelRow
            channel="SMS"
            enabled={channelForm.notificationsSmsEnabled}
            onToggle={(v) => setChannelForm((f) => ({ ...f, notificationsSmsEnabled: v }))}
            from={channelForm.notificationsSmsFrom}
            onFromChange={(v) => setChannelForm((f) => ({ ...f, notificationsSmsFrom: v }))}
            placeholder="+923001234567"
            hint="Twilio phone number in E.164 format."
          />
          <ChannelRow
            channel="WHATSAPP"
            enabled={channelForm.notificationsWhatsappEnabled}
            onToggle={(v) => setChannelForm((f) => ({ ...f, notificationsWhatsappEnabled: v }))}
            from={channelForm.notificationsWhatsappFrom}
            onFromChange={(v) => setChannelForm((f) => ({ ...f, notificationsWhatsappFrom: v }))}
            placeholder="+14155238886"
            hint='Twilio WhatsApp sender (the "whatsapp:" prefix is added automatically).'
          />

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <Bell size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
              <b>Provider keys</b> live in <code className="font-mono">.env</code>:
              <code className="font-mono"> RESEND_API_KEY</code>,
              <code className="font-mono"> TWILIO_ACCOUNT_SID</code>,
              <code className="font-mono"> TWILIO_AUTH_TOKEN</code>.
              Until they're set, sends are logged with status <b>SKIPPED</b> instead of going out.
            </p>
          </div>
        </div>

        <div className="px-8 py-5 border-t bg-slate-50 flex justify-end">
          <Button
            type="submit"
            disabled={!channelDirty || savingChannels}
            className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingChannels ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Channels
          </Button>
        </div>
      </form>

      {/* Templates */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-sm shadow-amber-500/20">
            <Pencil size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Templates</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Use {`{{placeholders}}`} for dynamic data. Changes apply immediately.
            </p>
          </div>
        </div>

        {loadingTemplates ? (
          <div className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300 mx-auto" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {groupedTemplates.map(([event, group]) => (
              <div key={event} className="px-8 py-6 space-y-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900">{EVENT_LABELS[event] || event}</h4>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">{EVENT_HINTS[event]}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {group.map((tpl) => {
                    const meta = CHANNEL_META[tpl.channel];
                    const Icon = meta.icon;
                    return (
                      <button
                        type="button"
                        key={tpl.id}
                        onClick={() => openEditor(tpl)}
                        className={cn(
                          "text-left p-4 rounded-2xl border-2 transition-all hover:shadow-md",
                          tpl.enabled ? "border-slate-200 bg-white hover:border-emerald-300" : "border-slate-100 bg-slate-50 opacity-70"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${meta.accent}`}>
                            <Icon size={14} />
                          </div>
                          <span className="text-sm font-black text-slate-900">{meta.label}</span>
                          {!tpl.enabled && (
                            <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                              Off
                            </span>
                          )}
                        </div>
                        {tpl.subject && (
                          <p className="text-[11px] font-bold text-slate-700 line-clamp-1">{tpl.subject}</p>
                        )}
                        <p className="text-[11px] font-medium text-slate-500 line-clamp-3 mt-1 whitespace-pre-line">
                          {tpl.body}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mt-3 flex items-center gap-1">
                          <Pencil size={10} /> Edit
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send test + recent log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleSendTest}
          className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20">
              <Send size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Send Test</h3>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Renders the chosen template with sample data
              </p>
            </div>
          </div>
          <div className="p-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Event</Label>
                <Select value={test.event} onValueChange={(v) => setTest((t) => ({ ...t, event: v }))}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Channel</Label>
                <Select value={test.channel} onValueChange={(v) => setTest((t) => ({ ...t, channel: v }))}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHANNEL_META).map(([k, m]) => (
                      <SelectItem key={k} value={k}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Recipient {test.channel === "EMAIL" ? "(email)" : "(phone, E.164)"}
              </Label>
              <div className="relative">
                <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  value={test.recipient}
                  onChange={(e) => setTest((t) => ({ ...t, recipient: e.target.value }))}
                  placeholder={test.channel === "EMAIL" ? "you@example.com" : "+923001234567"}
                  className="h-11 pl-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700"
                />
              </div>
            </div>
          </div>
          <div className="px-8 py-5 border-t bg-slate-50 flex justify-end">
            <Button
              type="submit"
              disabled={sendingTest}
              className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-6 font-bold rounded-xl shadow-lg shadow-emerald-600/20"
            >
              {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Test
            </Button>
          </div>
        </form>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center justify-between gap-2">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Recent Activity</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="h-8 px-3 rounded-lg font-bold text-slate-500"
            >
              <RefreshCw size={14} className={cn("mr-2", loadingLogs && "animate-spin")} />
              Refresh
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-96">
            {loadingLogs ? (
              <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300 mx-auto" /></div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-[11px] text-slate-400 font-medium italic">
                No activity yet. Generate a voucher or send a test to see logs.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const status = STATUS_META[log.status] || STATUS_META.QUEUED;
                  const Icon = status.icon;
                  const channelMeta = CHANNEL_META[log.channel];
                  return (
                    <div key={log.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-700">
                              {channelMeta?.label || log.channel}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-[11px] font-bold text-slate-500">
                              {EVENT_LABELS[log.event] || log.event}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
                            To: {log.recipient}
                          </p>
                          {log.errorMessage && (
                            <p className="text-[10px] font-medium text-rose-600 mt-1 line-clamp-2">
                              {log.errorMessage}
                            </p>
                          )}
                        </div>
                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border flex items-center gap-1 shrink-0", status.color)}>
                          <Icon size={10} />
                          {status.label}
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-400 mt-2">
                        {relativeTime(log.createdAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-amber-600" />
            Edit {editing ? `${EVENT_LABELS[editing.event]} · ${CHANNEL_META[editing.channel]?.label}` : "Template"}
          </DialogTitle>
          <DialogDescription>
            Use placeholders like <code className="font-mono">{`{{studentName}}`}</code>. Available tokens are listed below.
          </DialogDescription>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {editing?.channel === "EMAIL" && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Subject</Label>
                <Input
                  value={editForm.subject}
                  onChange={(e) => setEditForm((f) => ({ ...f, subject: e.target.value }))}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Body</Label>
              <Textarea
                value={editForm.body}
                onChange={(e) => setEditForm((f) => ({ ...f, body: e.target.value }))}
                rows={8}
                className="bg-slate-50 border-slate-200 rounded-xl font-medium text-slate-700"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="enabled"
                checked={editForm.enabled}
                onCheckedChange={(v) => setEditForm((f) => ({ ...f, enabled: !!v }))}
              />
              <Label htmlFor="enabled" className="text-xs font-bold text-slate-700 cursor-pointer">
                Enabled — fires on event when channel is on
              </Label>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Available Placeholders
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                {PLACEHOLDERS.map((p) => (
                  <div key={p.token} className="flex items-baseline gap-2">
                    <code className="font-mono text-[11px] font-bold text-emerald-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                      {p.token}
                    </code>
                    <span className="text-[11px] text-slate-500 font-medium">{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={savingTemplate} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={savingTemplate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
            >
              {savingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChannelRow({ channel, enabled, onToggle, from, onFromChange, placeholder, hint }) {
  const meta = CHANNEL_META[channel];
  const Icon = meta.icon;
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl border border-slate-100 bg-slate-50/40">
      <div className="flex items-center gap-4 md:w-56 shrink-0">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${meta.accent}`}>
          <Icon size={20} />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-900">{meta.label}</h4>
          <label className="flex items-center gap-2 mt-1 cursor-pointer">
            <Checkbox checked={enabled} onCheckedChange={(v) => onToggle(!!v)} id={`toggle-${channel}`} />
            <span className="text-[11px] font-bold text-slate-500">Enabled</span>
          </label>
        </div>
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">From</Label>
        <Input
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 bg-white border-slate-200 rounded-xl font-bold text-slate-700"
        />
        <p className="text-[11px] text-slate-400 font-medium">{hint}</p>
      </div>
    </div>
  );
}
