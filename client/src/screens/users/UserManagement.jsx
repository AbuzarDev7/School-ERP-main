import { useState, useEffect, useCallback } from "react"
import { Plus, Pencil, Trash2, Shield, User, Eye, EyeOff, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { adminUsersClient } from "@/services/adminUsersService"
import { useAuth } from "@/context/AuthContext"
import Forbidden from "@/screens/error/Forbidden"

// All modules available in the School ERP sidebar.
// key must match what DashboardLayout uses to filter nav items.
const ALL_MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "register-student", label: "Register Student" },
  { key: "students", label: "Students" },
  { key: "fee-structure", label: "Fee Structure" },
  { key: "fee-vouchers", label: "Fee Vouchers" },
  { key: "salary", label: "Salary Management" },
  { key: "payment-methods", label: "Payment Methods" },
  { key: "expenses", label: "Expenses" },
  { key: "reports", label: "Reports" },
  { key: "products", label: "Products" },
  { key: "invoices", label: "Invoices / Sales" },
  { key: "settings", label: "Settings" },
]

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  allowedModules: ["dashboard"],
}

export default function UserManagement() {
  const { user: currentUser, isAdmin } = useAuth()
  if (!isAdmin) return <Forbidden />
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Temp password shown after creating a user
  const [createdPassword, setCreatedPassword] = useState(null)
  const [passwordCopied, setPasswordCopied] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      const data = await adminUsersClient.list()
      setUsers(data)
    } catch {
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setShowPassword(false)
    setCreatedPassword(null)
    setIsAddOpen(true)
  }

  const openEdit = (u) => {
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      allowedModules: u.allowedModules || [],
    })
    setShowPassword(false)
    setEditingUser(u)
  }

  const toggleModule = (key) => {
    setForm((prev) => ({
      ...prev,
      allowedModules: prev.allowedModules.includes(key)
        ? prev.allowedModules.filter((k) => k !== key)
        : [...prev.allowedModules, key],
    }))
  }

  const handleSubmitAdd = async () => {
    if (!form.name.trim()) return toast.error("Name is required")
    if (!form.email.trim()) return toast.error("Email is required")
    if (!form.password || form.password.length < 6) return toast.error("Password must be at least 6 characters")

    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: "TEACHER",
        allowedModules: form.allowedModules,
      }
      const { user, tempPassword } = await adminUsersClient.invite(payload)
      setUsers((prev) => [user, ...prev])
      setCreatedPassword(tempPassword)
      toast.success(`User ${user.name} created`)
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create user")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitEdit = async () => {
    if (!editingUser) return
    if (!form.name.trim()) return toast.error("Name is required")
    if (!form.email.trim()) return toast.error("Email is required")

    setSubmitting(true)
    try {
      const isEditingAdmin = editingUser.role === "ADMIN"
      const payload = {
        name: form.name,
        email: form.email,
        ...(isEditingAdmin ? {} : { allowedModules: form.allowedModules }),
      }
      const updated = await adminUsersClient.update(editingUser.id, payload)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      setEditingUser(null)
      toast.success("User updated")
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update user")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    try {
      await adminUsersClient.remove(deletingUser.id)
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id))
      toast.success("User removed")
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete user")
    } finally {
      setDeletingUser(null)
    }
  }

  const copyPassword = () => {
    if (!createdPassword) return
    navigator.clipboard.writeText(createdPassword)
    setPasswordCopied(true)
    setTimeout(() => setPasswordCopied(false), 2000)
  }

  const moduleLabel = (u) => {
    if (u.role === "ADMIN") return "All modules"
    if (!u.allowedModules?.length) return "No modules"
    if (u.allowedModules.length <= 3)
      return u.allowedModules
        .map((k) => ALL_MODULES.find((m) => m.key === k)?.label || k)
        .join(", ")
    return `${u.allowedModules.length} modules`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create logins and choose which modules each user can see.</p>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 px-5 shadow-lg shadow-emerald-600/20">
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">System Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-100 border-b-2 border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200">User</th>
                <th className="px-6 py-4 text-left text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200">Email</th>
                <th className="px-6 py-4 text-left text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200">Role</th>
                <th className="px-6 py-4 text-left text-slate-700 font-bold uppercase text-[10px] tracking-wider border-r border-slate-200">Modules</th>
                <th className="px-6 py-4 text-right text-slate-700 font-bold uppercase text-[10px] tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-16 text-center text-sm text-slate-400">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-16 text-center text-sm text-slate-400">No users found</td></tr>
              ) : users.map((u, i) => {
                const isYou = u.id === currentUser?.id
                const rowBg = i % 2 === 0 ? "bg-white" : "bg-slate-50"
                return (
                  <tr key={u.id} className={`${rowBg} border-b border-slate-200 hover:bg-slate-100 transition-colors`}>
                    <td className="px-6 py-4 border-r border-slate-200">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-slate-200">
                          {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name} />}
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold text-xs">
                            {u.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-slate-800">{u.name}</span>
                        {isYou && (
                          <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase">you</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 border-r border-slate-200">{u.email}</td>
                    <td className="px-6 py-4 border-r border-slate-200">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${u.role === "ADMIN" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                        {u.role === "ADMIN" ? "Admin" : "Staff"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 border-r border-slate-200 text-sm">
                      {moduleLabel(u)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(u)}
                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Edit user">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!isYou && (
                          <Button size="icon" variant="ghost" onClick={() => setDeletingUser(u)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete user">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="px-6 py-4 bg-slate-50/50 border-t text-sm text-slate-400 font-medium">
            Showing <span className="text-slate-700 font-bold">1–{users.length}</span> of <span className="text-slate-700 font-bold">{users.length}</span> users
          </div>
        )}
      </div>

      {/* ---- ADD USER MODAL ---- */}
      <Dialog open={isAddOpen} onOpenChange={(v) => { if (!v) { setIsAddOpen(false); setCreatedPassword(null) } }}>
        <DialogContent className="w-[95vw] sm:max-w-lg p-0 overflow-hidden shadow-xl border border-slate-200 rounded-xl bg-white">
          <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <User size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">Add User</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">Create a login and assign module access.</DialogDescription>
            </div>
          </div>

          {createdPassword ? (
            // Success state — show temp password
            <div className="p-6 space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-sm font-bold text-emerald-800 mb-1">User created successfully!</p>
                <p className="text-xs text-emerald-600">Share this password with the user. It won't be shown again.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Password</Label>
                <div className="flex gap-2">
                  <Input value={createdPassword} readOnly className="font-mono font-bold text-slate-800 bg-slate-50 rounded-xl" />
                  <Button size="icon" variant="outline" onClick={copyPassword} className="h-10 w-10 shrink-0 rounded-xl">
                    {passwordCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                onClick={() => { setIsAddOpen(false); setCreatedPassword(null) }}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Name</Label>
                    <Input placeholder="e.g. Ahmed Khan" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="h-11 bg-slate-50 border-slate-200 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Email *</Label>
                    <Input type="email" placeholder="user@example.com" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="h-11 bg-slate-50 border-slate-200 rounded-xl" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Password *</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} placeholder="At least 6 characters"
                      value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="h-11 bg-slate-50 border-slate-200 rounded-xl pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Role — always Staff for new users */}
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                  <User size={16} className="text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-blue-800">Role: Staff</p>
                    <p className="text-[11px] text-blue-500">New users are always Staff. Only one Admin exists.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Modules they can access</Label>
                  <p className="text-xs text-slate-400">Only the ticked modules will appear in this user's sidebar.</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {ALL_MODULES.map((mod) => {
                      const checked = form.allowedModules.includes(mod.key)
                      return (
                        <button key={mod.key} type="button" onClick={() => toggleModule(mod.key)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${checked ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${checked ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}>
                            {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-xs font-semibold">{mod.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="h-11 px-6 font-bold rounded-xl">Cancel</Button>
                <Button onClick={handleSubmitAdd} disabled={submitting}
                  className="h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20">
                  {submitting ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---- EDIT USER MODAL ---- */}
      <Dialog open={!!editingUser} onOpenChange={(v) => { if (!v) setEditingUser(null) }}>
        <DialogContent className="w-[95vw] sm:max-w-lg p-0 overflow-hidden shadow-xl border border-slate-200 rounded-xl bg-white">
          <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Pencil size={18} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">Edit User</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">{editingUser?.email}</DialogDescription>
            </div>
          </div>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-11 bg-slate-50 border-slate-200 rounded-xl" />
              </div>
            </div>

            {editingUser?.role === "ADMIN" ? (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                <Shield size={16} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">Role: Admin</p>
                  <p className="text-[11px] text-emerald-600">Admin has full access. Role cannot be changed.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                  <User size={16} className="text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-blue-800">Role: Staff</p>
                    <p className="text-[11px] text-blue-500">Staff can only access the modules you select below.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Modules they can access</Label>
                  <p className="text-xs text-slate-400">Only the ticked modules will appear in this user's sidebar.</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {ALL_MODULES.map((mod) => {
                      const checked = form.allowedModules.includes(mod.key)
                      return (
                        <button key={mod.key} type="button" onClick={() => toggleModule(mod.key)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${checked ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${checked ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}>
                            {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-xs font-semibold">{mod.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditingUser(null)} className="h-11 px-6 font-bold rounded-xl">Cancel</Button>
            <Button onClick={handleSubmitEdit} disabled={submitting}
              className="h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20">
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- DELETE CONFIRM ---- */}
      <AlertDialog open={!!deletingUser} onOpenChange={(v) => { if (!v) setDeletingUser(null) }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingUser?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove their account and revoke all active sessions. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
