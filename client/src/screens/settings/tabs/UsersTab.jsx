import { useState, useMemo, useEffect } from "react";
import {
  UserPlus,
  Users,
  Trash2,
  Loader2,
  Pencil,
  KeyRound,
  Copy,
  Check,
  Search,
  ShieldCheck,
  Mail,
  Save,
  Eye,
  EyeOff,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { adminUsersClient } from "@/services/adminUsersService";
import {
  saveTempPassword,
  loadAllTempPasswords,
  clearTempPassword,
} from "@/lib/tempPasswordStore";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useAdminSettings } from "@/context/AdminSettingsContext";
import { relativeTime } from "@/lib/parseUserAgent";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "TEACHER", label: "Teacher" },
  { value: "STUDENT", label: "Student" },
];

export default function UsersTab() {
  const { user: currentUser } = useAuth();
  const { formatDate } = useSettings();
  const {
    users,
    roles,
    loadingUsers,
    loadingRoles,
    setUsers,
  } = useAdminSettings();
  const loading = loadingUsers || loadingRoles;

  const [search, setSearch] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "TEACHER", customRoleId: "" });
  const [inviting, setInviting] = useState(false);

  const [credentials, setCredentials] = useState(null); // { user, tempPassword, fromStore?, storedAt? }
  // Hidden by default — admin clicks the eye to reveal. Less risk of
  // shoulder-surfing when the dialog pops over a shared screen.
  const [showCredPassword, setShowCredPassword] = useState(false);

  // Cache of temp passwords the admin generated on this browser. Seeded on
  // mount from localStorage and kept in sync as we invite/reset/delete.
  const [storedPasswords, setStoredPasswords] = useState({});
  useEffect(() => {
    setStoredPasswords(loadAllTempPasswords());
  }, []);
  const [credCopied, setCredCopied] = useState(false);

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "TEACHER", customRoleId: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [resettingId, setResettingId] = useState(null);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.customRole?.name.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleInvite = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      return toast.error("Name and email are required");
    }
    setInviting(true);
    try {
      const result = await adminUsersClient.invite({
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim(),
        role: inviteForm.role,
        customRoleId: inviteForm.customRoleId || null,
      });
      setUsers((prev) => [result.user, ...prev]);
      setCredentials(result);
      // Cache the freshly-generated password locally so the admin can re-open
      // it from the row's "show stored password" button after they close the
      // dialog. Stored on this admin's browser only.
      saveTempPassword(result.user.id, result.tempPassword);
      setStoredPasswords((prev) => ({
        ...prev,
        [result.user.id]: { password: result.tempPassword, createdAt: new Date().toISOString() },
      }));
      setInviteOpen(false);
      setInviteForm({ name: "", email: "", role: "TEACHER", customRoleId: "" });
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to invite user");
    } finally {
      setInviting(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!credentials) return;
    const text = `Email: ${credentials.user.email}\nTemporary password: ${credentials.tempPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      setCredCopied(true);
      setTimeout(() => setCredCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select and copy the text manually");
    }
  };

  const openEdit = (u) => {
    setEditing(u);
    setEditForm({
      name: u.name,
      email: u.email,
      role: u.role,
      customRoleId: u.customRoleId || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      const updated = await adminUsersClient.update(editing.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        customRoleId: editForm.customRoleId || null,
      });
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success("User updated");
      setEditing(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update user");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResetPassword = async (u) => {
    setResettingId(u.id);
    try {
      const result = await adminUsersClient.resetPassword(u.id);
      setCredentials(result);
      // Overwrite any previously cached password for this user — the old one
      // is now invalid server-side.
      saveTempPassword(u.id, result.tempPassword);
      setStoredPasswords((prev) => ({
        ...prev,
        [u.id]: { password: result.tempPassword, createdAt: new Date().toISOString() },
      }));
      toast.success(`Password reset — share the new temporary password with ${u.name}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to reset password");
    } finally {
      setResettingId(null);
    }
  };

  // Opens the existing credentials dialog with a previously-generated
  // password, sourced from the local browser cache.
  const handleShowStoredPassword = (u) => {
    const stored = storedPasswords[u.id];
    if (!stored) return;
    setCredentials({
      user: u,
      tempPassword: stored.password,
      fromStore: true,
      storedAt: stored.createdAt,
    });
  };

  const handleForgetStoredPassword = () => {
    const userId = credentials?.user?.id;
    if (!userId) return;
    clearTempPassword(userId);
    setStoredPasswords((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setCredentials(null);
    setShowCredPassword(false);
    toast.info("Password cleared from this device");
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await adminUsersClient.remove(confirmDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== confirmDelete.id));
      // Clean up the local cache for this user — they no longer exist.
      clearTempPassword(confirmDelete.id);
      setStoredPasswords((prev) => {
        const next = { ...prev };
        delete next[confirmDelete.id];
        return next;
      });
      toast.success("User deleted");
      setConfirmDelete(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/20">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">User Accounts</h3>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Invite, edit, or revoke staff who can sign in to the system
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 md:flex-none md:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="h-11 pl-9 bg-slate-50 border-slate-200 rounded-xl text-sm"
              />
            </div>
            <Button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="h-11 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Invite User
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300 mx-auto" /></div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold italic">
            {search ? "No users match your search." : "No users yet."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUsers.map((u) => {
              const isMe = u.id === currentUser?.id;
              return (
                <div key={u.id} className="px-8 py-5 flex flex-col md:flex-row md:items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-emerald-500/20 shrink-0">
                    {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name} />}
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                      {u.name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-slate-900 truncate">{u.name}</h4>
                      {isMe && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                        u.role === "ADMIN" ? "text-rose-700 bg-rose-50 border-rose-100" :
                        u.role === "TEACHER" ? "text-blue-700 bg-blue-50 border-blue-100" :
                        "text-slate-700 bg-slate-50 border-slate-100"
                      )}>
                        {u.role}
                      </span>
                      {u.customRole && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck size={9} />
                          {u.customRole.name}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-medium text-slate-500 truncate">{u.email}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <span>Joined {formatDate(u.createdAt)}</span>
                      {u.lastLoginAt ? (
                        <span>Last sign-in {relativeTime(u.lastLoginAt)}</span>
                      ) : (
                        <span className="text-amber-600">Never signed in</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0 flex-wrap">
                    {storedPasswords[u.id] && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleShowStoredPassword(u)}
                        title="Show the last temp password generated on this device"
                        className="h-10 rounded-xl font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleResetPassword(u)}
                      disabled={resettingId === u.id}
                      title="Reset password (generates a new temp password and signs out all sessions)"
                      className="h-10 rounded-xl font-bold border-amber-200 text-amber-700 hover:bg-amber-50"
                    >
                      {resettingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openEdit(u)}
                      className="h-10 rounded-xl font-bold border-slate-200"
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    {!isMe && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setConfirmDelete(u)}
                        className="h-10 rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            Invite User
          </DialogTitle>
          <DialogDescription>
            We'll generate a temporary password for you to share. The user can change it from Settings → Account on first sign-in.
          </DialogDescription>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</Label>
              <Input
                value={inviteForm.name}
                onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jane Doe"
                className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="jane@example.com"
                  className="h-11 pl-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Base Role</Label>
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Custom Role</Label>
                <Select value={inviteForm.customRoleId || "none"} onValueChange={(v) => setInviteForm((f) => ({ ...f, customRoleId: v === "none" ? "" : v }))}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)} disabled={inviting} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
              {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-blue-600" />
            Edit User
          </DialogTitle>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Base Role</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Custom Role</Label>
                <Select value={editForm.customRoleId || "none"} onValueChange={(v) => setEditForm((f) => ({ ...f, customRoleId: v === "none" ? "" : v }))}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={savingEdit} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
              {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials display dialog */}
      <Dialog
        open={!!credentials}
        onOpenChange={(o) => {
          if (!o) {
            setCredentials(null);
            setShowCredPassword(false); // reset reveal state for the next user
          }
        }}
      >
        <DialogContent>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-500" />
            {credentials?.fromStore ? "Stored Temporary Password" : "Temporary Password"}
          </DialogTitle>
          <DialogDescription>
            {credentials?.fromStore ? (
              <>
                This is the last temporary password you generated for{" "}
                <b>{credentials?.user?.name}</b>, cached on this device. If the user has
                already changed it, this value will no longer work.
              </>
            ) : (
              <>
                Share these credentials with <b>{credentials?.user?.name}</b>. The user
                should change this password from Settings → Account after their first
                sign-in.
              </>
            )}
          </DialogDescription>

          {credentials?.fromStore && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-[11px] font-medium text-amber-800 leading-relaxed">
              Stored locally on this browser only — generated{" "}
              {credentials.storedAt ? relativeTime(credentials.storedAt) : "earlier"}.
              Sign out clears the cache.
            </div>
          )}

          <div className="space-y-3 my-4">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</p>
                <p className="font-mono text-sm font-bold text-slate-800 break-all">{credentials?.user?.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Temporary Password</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-base font-black text-emerald-700 break-all flex-1 min-w-0">
                    {showCredPassword
                      ? credentials?.tempPassword
                      : credentials?.tempPassword
                        ? "•".repeat(credentials.tempPassword.length)
                        : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCredPassword((s) => !s)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors shrink-0"
                    aria-label={showCredPassword ? "Hide password" : "Show password"}
                    title={showCredPassword ? "Hide password" : "Show password"}
                  >
                    {showCredPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleCopyCredentials}
              className="w-full h-11 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {credCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {credCopied ? "Copied!" : "Copy email + password"}
            </Button>
          </div>

          <DialogFooter className="gap-2">
            {credentials?.fromStore && (
              <Button
                type="button"
                variant="outline"
                onClick={handleForgetStoredPassword}
                className="rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Forget on this device
              </Button>
            )}
            <Button onClick={() => setCredentials(null)} className="rounded-xl font-bold">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user "{confirmDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access immediately. Active sessions will be invalidated. This is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-500 hover:bg-rose-600 text-white font-bold"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
