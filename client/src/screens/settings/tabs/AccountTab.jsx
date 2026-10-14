import { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Lock,
  Save,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  CircleAlert,
  CircleCheck,
  Camera,
  Trash2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AccountTab() {
  const { user, updateProfile, changePassword, uploadAvatar, removeAvatar, refreshProfile } = useAuth();
  const { formatDate } = useSettings();

  const [profile, setProfile] = useState({ name: "", email: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwd, setPwd] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) setProfile({ name: user.name || "", email: user.email || "" });
  }, [user]);

  // Pull the live profile once on mount so lastLoginAt + avatarUrl are fresh.
  useEffect(() => {
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profileChanged =
    profile.name.trim() !== (user?.name || "") ||
    profile.email.trim().toLowerCase() !== (user?.email || "").toLowerCase();

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileChanged) return;
    if (profile.name.trim().length < 2) return toast.error("Name must be at least 2 characters");
    if (!/^\S+@\S+\.\S+$/.test(profile.email.trim())) return toast.error("Enter a valid email address");

    setSavingProfile(true);
    try {
      await updateProfile({ name: profile.name.trim(), email: profile.email.trim() });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const newRules = [
    { label: "At least 6 characters", ok: pwd.newPassword.length >= 6 },
    { label: "Different from current password", ok: pwd.newPassword.length > 0 && pwd.newPassword !== pwd.oldPassword },
    { label: "Matches confirmation", ok: pwd.newPassword.length > 0 && pwd.newPassword === pwd.confirmPassword },
  ];
  const allRulesOk = newRules.every((r) => r.ok);
  const canSubmitPwd = pwd.oldPassword.length > 0 && allRulesOk;

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmitPwd) return;

    setSavingPwd(true);
    try {
      await changePassword(pwd);
      toast.success("Password changed successfully");
      setPwd({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setShowOld(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (err) {
      toast.error(err?.message || "Failed to change password");
    } finally {
      setSavingPwd(false);
    }
  };

  const handlePickAvatar = () => fileInputRef.current?.click();

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file later
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      return toast.error("Only JPG, PNG, or WebP images are allowed");
    }
    if (file.size > 2 * 1024 * 1024) {
      return toast.error("Image must be under 2 MB");
    }
    setAvatarBusy(true);
    try {
      await uploadAvatar(file);
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err?.message || "Failed to upload photo");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.avatarUrl) return;
    setAvatarBusy(true);
    try {
      await removeAvatar();
      toast.success("Profile photo removed");
    } catch (err) {
      toast.error(err?.message || "Failed to remove photo");
    } finally {
      setAvatarBusy(false);
    }
  };

  const lastLoginText = user?.lastLoginAt
    ? `${formatDate(user.lastLoginAt)} · ${new Date(user.lastLoginAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}`
    : "First sign-in — no previous record";

  return (
    <div className="space-y-8">
      {/* Avatar + last login row */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="relative">
          <Avatar className="h-24 w-24 border-4 border-emerald-500/20 shadow-lg">
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user?.name} />}
            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-black text-3xl">
              {user?.name?.charAt(0).toUpperCase() || "A"}
            </AvatarFallback>
          </Avatar>
          {avatarBusy && (
            <div className="absolute inset-0 rounded-full bg-white/80 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-black text-slate-900 truncate">{user?.name || "Administrator"}</h3>
          <p className="text-sm text-slate-500 font-medium truncate">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2 text-xs font-bold text-slate-400">
            <Clock size={13} className="shrink-0" />
            <span className="uppercase tracking-wider">Last sign-in:</span>
            <span className="text-slate-600 normal-case tracking-normal">{lastLoginText}</span>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarFile}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handlePickAvatar}
            disabled={avatarBusy}
            className="h-11 rounded-xl font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <Camera className="mr-2 h-4 w-4" />
            {user?.avatarUrl ? "Change Photo" : "Upload Photo"}
          </Button>
          {user?.avatarUrl && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemoveAvatar}
              disabled={avatarBusy}
              className="h-11 rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Profile information card */}
      <form
        onSubmit={handleProfileSubmit}
        className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/20">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Profile Information</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Update your display name and contact email
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</Label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                placeholder="Your full name"
                className="h-12 pl-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700 focus-visible:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Address</Label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                className="h-12 pl-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700 focus-visible:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 font-medium pt-1">
              You will use this email to sign in next time.
            </p>
          </div>
        </div>

        <div className="px-8 py-5 border-t bg-slate-50 flex justify-end">
          <Button
            type="submit"
            disabled={!profileChanged || savingProfile}
            className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </form>

      {/* Password card */}
      <form
        onSubmit={handlePasswordSubmit}
        className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
      >
        <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-sm shadow-amber-500/20">
            <KeyRound size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Change Password</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Verify your current password to set a new one
            </p>
          </div>
        </div>

        <div className="p-8 space-y-5">
          <PasswordField
            label="Current Password"
            value={pwd.oldPassword}
            onChange={(v) => setPwd((p) => ({ ...p, oldPassword: v }))}
            show={showOld}
            setShow={setShowOld}
            placeholder="Enter current password"
            autoComplete="current-password"
          />
          <PasswordField
            label="New Password"
            value={pwd.newPassword}
            onChange={(v) => setPwd((p) => ({ ...p, newPassword: v }))}
            show={showNew}
            setShow={setShowNew}
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm New Password"
            value={pwd.confirmPassword}
            onChange={(v) => setPwd((p) => ({ ...p, confirmPassword: v }))}
            show={showConfirm}
            setShow={setShowConfirm}
            placeholder="Re-enter new password"
            autoComplete="new-password"
          />

          {(pwd.newPassword.length > 0 || pwd.confirmPassword.length > 0) && (
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Password Requirements
              </p>
              {newRules.map((rule) => (
                <div key={rule.label} className="flex items-center gap-2">
                  {rule.ok ? (
                    <CircleCheck size={14} className="text-emerald-600 shrink-0" />
                  ) : (
                    <CircleAlert size={14} className="text-slate-300 shrink-0" />
                  )}
                  <span className={cn("text-xs font-medium", rule.ok ? "text-emerald-700" : "text-slate-400")}>
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t bg-slate-50 flex justify-end">
          <Button
            type="submit"
            disabled={!canSubmitPwd || savingPwd}
            className="h-11 bg-amber-500 hover:bg-amber-600 text-white px-8 font-bold rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingPwd ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            Update Password
          </Button>
        </div>
      </form>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, setShow, placeholder, autoComplete }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</Label>
      <div className="relative">
        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-12 pl-11 pr-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700 focus-visible:ring-amber-500"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
