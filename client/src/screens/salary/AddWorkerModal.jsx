import React, { useState, useEffect, useRef } from "react";
import { UserPlus, User, Phone, Briefcase, Wallet, Clock, Activity, CalendarDays, Camera, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNumericInput } from "@/hooks/useNumericInput";
import { toast } from "sonner";

// Pakistani mobile format: 0300-1234567 (4 digits, dash, 7 digits — 11 digits total)
const formatPhone = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
};

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${import.meta.env.VITE_API_URL || ""}${path}`;
};

export default function AddWorkerModal({ open, setOpen, onSave, initialData, loading }) {
  const { sanitize } = useNumericInput();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    role: "",
    monthlySalary: 0,
    hourlyOvertimeRate: 0,
    standardWorkingDays: 26,
    status: "Active",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        phone: formatPhone(initialData.phone || ""),
        role: initialData.role || "",
        monthlySalary: initialData.monthlySalary || 0,
        hourlyOvertimeRate: initialData.hourlyOvertimeRate || 0,
        standardWorkingDays: initialData.standardWorkingDays || 26,
        status: initialData.status || "Active",
      });
      setPhotoPreview(getImageUrl(initialData.profilePicture || ""));
    } else {
      setForm({
        name: "",
        phone: "",
        role: "",
        monthlySalary: 0,
        hourlyOvertimeRate: 0,
        standardWorkingDays: 26,
        status: "Active",
      });
      setPhotoPreview(null);
    }
    setPhotoFile(null);
  }, [initialData, open]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "monthlySalary" || name === "hourlyOvertimeRate" || name === "standardWorkingDays") {
      const numValue = sanitize(value);
      if (numValue !== null) {
        setForm((prev) => ({ ...prev, [name]: numValue }));
      }
    } else if (name === "phone") {
      setForm((prev) => ({ ...prev, phone: formatPhone(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Worker name is required");
    if (form.monthlySalary <= 0) return toast.error("Monthly salary must be greater than zero");
    onSave(form, photoFile);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[95vh] p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl bg-white flex flex-col">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b bg-slate-50/50 flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0">
            <UserPlus size={22} />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-base sm:text-xl font-bold text-slate-900 truncate">
              {initialData ? "Edit Worker Details" : "Register New Worker"}
            </DialogTitle>
            <DialogDescription className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 line-clamp-2">
              Set up employee profile and default pay configurations.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 bg-white">
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5 sm:space-y-6">

            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 hover:border-emerald-400 transition-colors flex items-center justify-center group"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400 group-hover:text-emerald-500 transition-colors">
                      <Camera size={22} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Photo</span>
                    </div>
                  )}
                </button>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm transition-colors"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Click to upload photo (JPG, PNG, WebP · 1 MB max)</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Full Name *</Label>
                <div className="relative"><Input name="name" value={form.name} onChange={handleChange} className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white" placeholder="Zulfiqar" /><div className="absolute left-3 top-3 text-slate-400"><User size={18}/></div></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Role / Position</Label>
                  <div className="relative"><Input name="role" value={form.role} onChange={handleChange} className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white" placeholder="Maintenance" /><div className="absolute left-3 top-3 text-slate-400"><Briefcase size={18}/></div></div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Phone Number</Label>
                  <div className="relative"><Input name="phone" type="tel" inputMode="numeric" maxLength={12} value={form.phone} onChange={handleChange} className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white" placeholder="0300-1234567" /><div className="absolute left-3 top-3 text-slate-400"><Phone size={18}/></div></div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Monthly Salary (Rs) *</Label>
                  <div className="relative"><Input type="text" inputMode="numeric" name="monthlySalary" value={form.monthlySalary === 0 ? "" : form.monthlySalary} onChange={handleChange} className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white font-bold text-emerald-700" placeholder="0" /><div className="absolute left-3 top-3 text-slate-400"><Wallet size={18}/></div></div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Overtime Rate (Rs/hr)</Label>
                  <div className="relative"><Input type="text" inputMode="numeric" name="hourlyOvertimeRate" value={form.hourlyOvertimeRate === 0 ? "" : form.hourlyOvertimeRate} onChange={handleChange} className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white" placeholder="0" /><div className="absolute left-3 top-3 text-slate-400"><Clock size={18}/></div></div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Standard Working Days</Label>
                  <div className="relative">
                    <Input type="text" inputMode="numeric" name="standardWorkingDays" value={form.standardWorkingDays} onChange={handleChange} className="h-11 pl-10 rounded-xl bg-slate-50 border-slate-200 focus:bg-white" placeholder="26" />
                    <div className="absolute left-3 top-3 text-slate-400"><CalendarDays size={18}/></div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Employment Status</Label>
                  <Select value={form.status} onValueChange={(val) => setForm(prev => ({ ...prev, status: val }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200">
                       <div className="flex items-center gap-2 text-slate-700"><Activity size={18} className="text-slate-400"/><SelectValue /></div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-5 sm:px-8 py-4 border-t bg-slate-50/50 shrink-0">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)} className="h-12 sm:h-12 w-full sm:w-auto px-6 font-bold text-slate-600 hover:bg-slate-200 rounded-xl">Cancel</Button>
            <Button type="submit" disabled={loading} className="h-12 sm:h-12 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 sm:px-10 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98]">
              {initialData ? "Update Worker" : "Register Worker"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
