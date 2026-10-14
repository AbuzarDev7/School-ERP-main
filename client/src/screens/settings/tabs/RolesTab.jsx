import { useState, useMemo } from "react";
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  Lock,
  Users as UsersIcon,
  Search,
  CircleCheck,
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { rolesClient } from "@/services/rolesService";
import { useAdminSettings } from "@/context/AdminSettingsContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RolesTab() {
  const { roles, permissions, loadingRoles: loading, setRoles } = useAdminSettings();

  const [editor, setEditor] = useState(null); // { mode: 'create' | 'edit', role? }
  const [form, setForm] = useState({ name: "", description: "", permissionIds: new Set() });
  const [permSearch, setPermSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const groupedPermissions = useMemo(() => {
    const filtered = permissions.filter((p) => {
      if (!permSearch) return true;
      const q = permSearch.toLowerCase();
      return p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q);
    });
    const map = new Map();
    for (const p of filtered) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category).push(p);
    }
    return Array.from(map.entries());
  }, [permissions, permSearch]);

  const openCreate = () => {
    setForm({ name: "", description: "", permissionIds: new Set() });
    setPermSearch("");
    setEditor({ mode: "create" });
  };

  const openEdit = (role) => {
    setForm({
      name: role.name,
      description: role.description || "",
      permissionIds: new Set((role.permissions || []).map((p) => p.id)),
    });
    setPermSearch("");
    setEditor({ mode: "edit", role });
  };

  const togglePermission = (id) => {
    setForm((f) => {
      const next = new Set(f.permissionIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...f, permissionIds: next };
    });
  };

  const toggleCategory = (categoryPerms) => {
    const ids = categoryPerms.map((p) => p.id);
    setForm((f) => {
      const next = new Set(f.permissionIds);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return { ...f, permissionIds: next };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      return toast.error("Role name must be at least 2 characters");
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        permissionIds: Array.from(form.permissionIds),
      };
      if (editor.mode === "create") {
        const created = await rolesClient.create(payload);
        setRoles((prev) => [...prev, created].sort((a, b) => Number(b.isSystem) - Number(a.isSystem) || a.name.localeCompare(b.name)));
        toast.success(`Role "${created.name}" created`);
      } else {
        const updated = await rolesClient.update(editor.role.id, payload);
        setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        toast.success(`Role "${updated.name}" saved`);
      }
      setEditor(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await rolesClient.remove(confirmDelete.id);
      setRoles((prev) => prev.filter((r) => r.id !== confirmDelete.id));
      toast.success("Role deleted");
      setConfirmDelete(null);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to delete role");
    } finally {
      setDeleting(false);
    }
  };

  const isSystemEditor = editor?.mode === "edit" && editor.role?.isSystem;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Roles & Permissions</h3>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Define what each user type can access
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={openCreate}
            className="h-11 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
          >
            <Plus className="mr-2 h-4 w-4" /> New Role
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-slate-300 mx-auto" /></div>
        ) : roles.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold italic">No roles yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {roles.map((role) => (
              <div key={role.id} className="px-8 py-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-sm font-black text-slate-900">{role.name}</h4>
                    {role.isSystem && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Lock size={9} /> System
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-[11px] font-medium text-slate-500 mt-1">{role.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <span className="flex items-center gap-1">
                      <CircleCheck size={11} className="text-emerald-500" />
                      {role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1">
                      <UsersIcon size={11} />
                      {role._count?.users ?? 0} user{(role._count?.users ?? 0) === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openEdit(role)}
                    className="h-10 rounded-xl font-bold border-slate-200"
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  {!role.isSystem && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmDelete(role)}
                      className="h-10 rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor dialog */}
      <Dialog open={!!editor} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            {editor?.mode === "create" ? "Create Role" : `Edit ${editor?.role?.name}`}
          </DialogTitle>
          <DialogDescription>
            {isSystemEditor
              ? "System role — name is locked, but you can adjust permissions."
              : "Pick the permissions this role should have. Tick a category header to toggle all permissions in that group."}
          </DialogDescription>

          <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={isSystemEditor}
                  placeholder="e.g. Cashier"
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description (Optional)</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What this role is for"
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Permissions</Label>
                <div className="relative w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                    placeholder="Filter..."
                    className="h-9 pl-9 bg-slate-50 border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {groupedPermissions.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic font-medium p-4 text-center">
                  No permissions match your filter.
                </p>
              ) : (
                <div className="space-y-3">
                  {groupedPermissions.map(([category, perms]) => {
                    const allSelected = perms.every((p) => form.permissionIds.has(p.id));
                    const someSelected = perms.some((p) => form.permissionIds.has(p.id));
                    return (
                      <div key={category} className="border border-slate-200 rounded-2xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleCategory(perms)}
                          className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={allSelected ? true : someSelected ? "indeterminate" : false}
                              onCheckedChange={() => toggleCategory(perms)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
                              {category}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">
                            {perms.filter((p) => form.permissionIds.has(p.id)).length} / {perms.length}
                          </span>
                        </button>
                        <div className="divide-y divide-slate-100">
                          {perms.map((p) => {
                            const checked = form.permissionIds.has(p.id);
                            return (
                              <label
                                key={p.id}
                                className={cn(
                                  "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                                  checked ? "bg-emerald-50/50" : "hover:bg-slate-50"
                                )}
                              >
                                <Checkbox checked={checked} onCheckedChange={() => togglePermission(p.id)} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-800">{p.label}</p>
                                  <code className="text-[10px] font-mono text-slate-400">{p.key}</code>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditor(null)} disabled={saving} className="rounded-xl font-bold">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role "{confirmDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This is irreversible. Users currently assigned to this role must be reassigned first.
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
