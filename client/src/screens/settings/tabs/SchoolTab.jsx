import { useState, useEffect, useRef } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Image as ImageIcon,
  Camera,
  Trash2,
  Loader2,
  Save,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "sonner";

export default function SchoolTab() {
  const { settings, updateSettings, uploadLogo, removeLogo } = useSettings();

  const [form, setForm] = useState({
    schoolName: "",
    schoolPhone: "",
    schoolEmail: "",
    schoolAddress: "",
    voucherHeader: "",
    voucherFooter: "",
  });
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setForm({
      schoolName: settings.schoolName || "",
      schoolPhone: settings.schoolPhone || "",
      schoolEmail: settings.schoolEmail || "",
      schoolAddress: settings.schoolAddress || "",
      voucherHeader: settings.voucherHeader || "",
      voucherFooter: settings.voucherFooter || "",
    });
  }, [settings]);

  const dirty =
    form.schoolName !== (settings.schoolName || "") ||
    form.schoolPhone !== (settings.schoolPhone || "") ||
    form.schoolEmail !== (settings.schoolEmail || "") ||
    form.schoolAddress !== (settings.schoolAddress || "") ||
    form.voucherHeader !== (settings.voucherHeader || "") ||
    form.voucherFooter !== (settings.voucherFooter || "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dirty) return;
    if (!form.schoolName.trim()) return toast.error("School name is required");

    setSaving(true);
    try {
      await updateSettings({
        schoolName: form.schoolName.trim(),
        schoolPhone: form.schoolPhone.trim(),
        schoolEmail: form.schoolEmail.trim(),
        schoolAddress: form.schoolAddress.trim(),
        voucherHeader: form.voucherHeader.trim(),
        voucherFooter: form.voucherFooter.trim(),
      });
      toast.success("School profile updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      return toast.error("Only JPG, PNG, or WebP images are allowed");
    }
    if (file.size > 2 * 1024 * 1024) {
      return toast.error("Image must be under 2 MB");
    }
    setLogoBusy(true);
    try {
      await uploadLogo(file);
      toast.success("Logo updated");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to upload logo");
    } finally {
      setLogoBusy(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!settings.schoolLogoUrl) return;
    setLogoBusy(true);
    try {
      await removeLogo();
      toast.success("Logo removed");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to remove logo");
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Logo card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="relative w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
          {settings.schoolLogoUrl ? (
            <img src={settings.schoolLogoUrl} alt="School logo" className="w-full h-full object-contain" />
          ) : (
            <ImageIcon size={32} className="text-slate-300" />
          )}
          {logoBusy && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-slate-900 tracking-tight">School Logo</h3>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            Used on printed vouchers and invoices. JPG, PNG, or WebP — under 2 MB.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleLogoFile}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={logoBusy}
            className="h-11 rounded-xl font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <Camera className="mr-2 h-4 w-4" />
            {settings.schoolLogoUrl ? "Replace" : "Upload"}
          </Button>
          {settings.schoolLogoUrl && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemoveLogo}
              disabled={logoBusy}
              className="h-11 rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* School details */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">School Profile</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Appears on vouchers, invoices, and reports
            </p>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">School Name</Label>
            <div className="relative">
              <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                value={form.schoolName}
                onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
                className="h-12 pl-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Phone</Label>
            <div className="relative">
              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                value={form.schoolPhone}
                onChange={(e) => setForm((f) => ({ ...f, schoolPhone: e.target.value }))}
                placeholder="+92 300 1234567"
                className="h-12 pl-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email</Label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                type="email"
                value={form.schoolEmail}
                onChange={(e) => setForm((f) => ({ ...f, schoolEmail: e.target.value }))}
                placeholder="info@school.com"
                className="h-12 pl-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700"
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Address</Label>
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-3 text-slate-400 pointer-events-none" />
              <Textarea
                value={form.schoolAddress}
                onChange={(e) => setForm((f) => ({ ...f, schoolAddress: e.target.value }))}
                rows={2}
                placeholder="Street, City, Postal code"
                className="pl-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Voucher / invoice header & footer */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/20">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Voucher & Invoice Text</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Optional header and footer notes printed on every voucher and invoice
            </p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Header Text</Label>
            <Textarea
              value={form.voucherHeader}
              onChange={(e) => setForm((f) => ({ ...f, voucherHeader: e.target.value }))}
              rows={2}
              placeholder='e.g. "Affiliated with Federal Board of Intermediate & Secondary Education"'
              className="bg-slate-50 border-slate-200 rounded-xl font-medium text-slate-700"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Footer Text</Label>
            <Textarea
              value={form.voucherFooter}
              onChange={(e) => setForm((f) => ({ ...f, voucherFooter: e.target.value }))}
              rows={2}
              placeholder='e.g. "Fee once paid is non-refundable. Late payment incurs Rs. 100/day fine."'
              className="bg-slate-50 border-slate-200 rounded-xl font-medium text-slate-700"
            />
          </div>
        </div>

        <div className="px-8 py-5 border-t bg-slate-50 flex justify-end">
          <Button
            type="submit"
            disabled={!dirty || saving}
            className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-bold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>
    </form>
  );
}
