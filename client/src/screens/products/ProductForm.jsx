import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Package, Save, Tag, Hash, IndianRupee, Layers } from "lucide-react";
import { useNumericInput } from "@/hooks/useNumericInput";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

export default function ProductForm({ open, setOpen, onSave, initialData }) {
  const categories = ["Uniform", "Books", "Stationary", "Sports", "Other"];
  const { sanitize } = useNumericInput();

  const [form, setForm] = useState({
    productName: "",
    productNumber: "",
    category: "",
    sku: "",
    unitPrice: "",
    stockQuantity: "",
    description: ""
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        sku: initialData.sku ?? 0,
        unitPrice: initialData.unitPrice ?? 0,
        stockQuantity: initialData.stockQuantity ?? 0
      });
    } else {
      setForm({
        productName: "", category: "", sku: 0, unitPrice: 0, stockQuantity: 0, description: ""
      });
    }
    setErrors({});
  }, [initialData, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["sku", "unitPrice", "stockQuantity"].includes(name)) {
      const numValue = sanitize(value);
      if (numValue !== null) {
        setForm(prev => ({ ...prev, [name]: numValue }));
      }
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = () => {
    const newErrors = {};
    if (!form.productName) newErrors.productName = "Required";
    if (!form.unitPrice) newErrors.unitPrice = "Required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required fields.");
      return;
    }

    onSave({
      ...form,
      sku: Number(form.sku) || 0,
      unitPrice: Number(form.unitPrice) || 0,
      stockQuantity: Number(form.stockQuantity) || 0
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[700px] p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl bg-white">
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Package size={24} />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {initialData ? "Edit Product Details" : "New Inventory Item"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Manage item details, SKU tracking, and pricing configurations.
            </DialogDescription>
          </div>
        </div>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto bg-white">
          {initialData && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Internal Registry ID</Label>
              <Input value={form.productNumber ? `# ${form.productNumber}` : 'N/A'} readOnly className="h-11 bg-emerald-50/50 font-bold text-emerald-700 rounded-xl border-emerald-100" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Product Name *</Label>
              <Input 
                name="productName" 
                value={form.productName} 
                onChange={handleChange} 
                className={`h-11 rounded-xl transition-all focus:bg-white ${errors.productName ? "border-red-500 bg-red-50/10" : "bg-slate-50 border-slate-200"}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Category</Label>
              <Select 
                value={form.category} 
                onValueChange={(val) => setForm(prev => ({ ...prev, category: val }))}
              >
                <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">SKU / Item Code</Label>
              <Input 
                name="sku" 
                type="text" 
                inputMode="numeric" 
                value={form.sku === 0 ? "" : form.sku} 
                onChange={handleChange} 
                className="h-11 bg-slate-50 border-slate-200 focus:bg-white rounded-xl" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Unit Price *</Label>
              <Input 
                name="unitPrice" 
                type="text" 
                inputMode="numeric" 
                value={form.unitPrice === 0 ? "" : form.unitPrice} 
                onChange={handleChange} 
                className={`h-11 rounded-xl transition-all focus:bg-white ${errors.unitPrice ? "border-red-500 bg-red-50/10" : "bg-slate-50 border-slate-200"}`} 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Available Stock</Label>
              <Input 
                name="stockQuantity" 
                type="text" 
                inputMode="numeric" 
                value={form.stockQuantity === 0 ? "" : form.stockQuantity} 
                onChange={handleChange} 
                className="h-11 bg-slate-50 border-slate-200 focus:bg-white rounded-xl" 
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Product Description</Label>
            <Textarea name="description" value={form.description} onChange={handleChange} rows={3} className="resize-none bg-slate-50 border-slate-200 focus:bg-white rounded-xl" />
          </div>
        </div>

        <div className="px-6 py-5 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
          <Button variant="ghost" onClick={() => setOpen(false)} className="h-12 px-6 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-10 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]">
            Save Inventory Item
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}