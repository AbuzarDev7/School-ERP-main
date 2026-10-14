import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useProducts } from "@/context/ProductContext";
import { useNumericInput } from "@/hooks/useNumericInput";
import { useStudents } from "@/context/StudentContext";
import { usePaymentMethods } from "@/context/PaymentMethodContext";
import InvoicePrinter from "./InvoicePrinter";
import { Package, Save, Tag, IndianRupee, Plus, Trash2, Receipt, Calendar, User, Search, X } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvoiceForm({ open, setOpen, onSave, initialData }) {
  const { products } = useProducts();
  const { students } = useStudents();
  const { activeMethods } = usePaymentMethods();
  const { sanitize } = useNumericInput();

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    studentId: "",
    invoiceDate: today,
    invoiceNumber: "",
    items: [{ productId: "", quantity: 1, unitPrice: 0, total: 0 }],
    discount: 0,
    notes: "",
    paymentMethod: ""
  });

  const [studentSearch, setStudentSearch] = useState("");
  const studentSearchRef = useRef(null);

  const searchResults = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const term = studentSearch.toLowerCase();
    return students.filter(s =>
      s.regNumber?.toString().includes(term) ||
      s.rollNumber?.toString().includes(term)
    ).slice(0, 6);
  }, [students, studentSearch]);

  const handleSelectStudent = (student) => {
    setForm(prev => ({ ...prev, studentId: student.id }));
    setStudentSearch("");
  };

  // Totals Calculation
  const totals = useMemo(() => {
    const subtotal = form.items.reduce((acc, item) => acc + (item.total || 0), 0);
    const discountPercent = parseFloat(form.discount) || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const grandTotal = Math.max(0, subtotal - discountAmount);
    return { subtotal, grandTotal, discountAmount };
  }, [form.items, form.discount]);

  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        paymentMethod: initialData.paymentMethod || activeMethods[0]?.name || "",
      });
    } else {
      setForm({
        studentId: "",
        invoiceDate: today,
        invoiceNumber: "",
        items: [{ productId: "", quantity: 1, unitPrice: 0, total: 0 }],
        discount: 0,
        notes: "",
        paymentMethod: activeMethods[0]?.name || ""
      });
    }
    setStudentSearch("");
  }, [initialData, open, activeMethods]);

  // Auto-focus Student Search field when the modal opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        studentSearchRef.current?.focus();
      }, 150); // Small delay to account for Dialog animation and focus management
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "discount") {
      const num = sanitize(value, 100, 0); // Max 100, Min 0 for percentage
      if (num !== null) {
        setForm(prev => ({ ...prev, [name]: num }));
      }
    } else if (["invoiceNumber"].includes(name)) { // Assuming invoiceNumber can also be numeric
      const num = sanitize(value);
      if (num !== null) {
        setForm(prev => ({ ...prev, [name]: num }));
      }
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: "", quantity: 1, unitPrice: 0, total: 0 }]
    }));
  };

  const removeItem = (index) => {
    if (form.items.length === 1) return;
    const newItems = [...form.items];
    newItems.splice(index, 1);
    setForm(prev => ({ ...prev, items: newItems }));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...form.items]; // Create a shallow copy of the items array
    let item = { ...newItems[index] }; // Create a shallow copy of the item

    if (field === "quantity" || field === "unitPrice") {
      const num = sanitize(value);
      if (num === null) return; // Don't update if invalid
      item[field] = num;
    } else {
      item[field] = value;
    }

    if (field === "productId") {
      const product = products.find(p => p.id === value);
      item.unitPrice = product ? product.unitPrice : 0;
    }

    item.total = Number(item.quantity || 0) * Number(item.unitPrice || 0);
    newItems[index] = item;
    setForm(prev => ({ ...prev, items: newItems }));
  };

  const handleSubmit = () => {
    if (!form.studentId) return toast.error("Please select a student.");
    if (form.items.some(i => !i.productId)) return toast.error("Please select products for all lines.");
    if (totals.grandTotal > 0 && !form.paymentMethod) return toast.error("Select a payment method to receive this sale.");

    // Check stock availability locally before submitting
    for (const item of form.items) {
      const product = products.find(p => p.id === item.productId);
      if (product && item.quantity > product.stockQuantity) {
        return toast.error(`Insufficient stock for ${product.productName}. Available: ${product.stockQuantity}`);
      }
    }

    // Sanitize numerical fields to ensure they are sent as numbers, not strings
    const sanitizedData = {
      ...form,
      discount: Number(form.discount || 0),
      items: form.items.map(item => ({
        ...item,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        total: Number(item.total || 0)
      })),
      subtotal: totals.subtotal,
      grandTotal: totals.grandTotal
    };

    onSave(sanitizedData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[98vw] sm:max-w-250 p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl bg-white">
        <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Receipt size={24} />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {initialData ? "Edit Sales Invoice" : "Create New Sale / Invoice"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
              Process product sales and generate itemized billing for students.
            </DialogDescription>
          </div>
          {initialData && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Actions</span>
              <InvoicePrinter invoice={form} student={students.find(s => s.id === form.studentId)} products={products} />
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50/30 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Invoice #</Label>
                    <Input value={form.invoiceNumber || "Auto-generated"} readOnly className="h-11 bg-slate-100/50 border-slate-200 font-mono text-emerald-600 font-bold rounded-xl" />
                  </div>
                  {/* Student Search */}
                  <div className="space-y-2 relative">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Student Lookup *</Label>
                    <div className="relative group">
                      <Search className="absolute left-2 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        ref={studentSearchRef}
                        placeholder="Type reg# or roll#..."
                        className="pl-8 h-11 bg-slate-50 border-slate-200 focus:bg-white rounded-xl transition-all"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-2xl mt-1 overflow-hidden max-h-64 overflow-y-auto">
                        {searchResults.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-slate-50 last:border-none flex justify-between items-center text-sm transition-colors"
                            onClick={() => handleSelectStudent(s)}
                          >
                            <span>{s.firstName} {s.lastName}</span>
                            <span className="text-xs text-slate-500">Roll: {s.rollNumber} | {s.class}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Invoice Date</Label>
                    <Input type="date" name="invoiceDate" value={form.invoiceDate} onChange={handleChange} className="h-11 bg-slate-50 border-slate-200 rounded-xl" />
                  </div>
                </div>

                {/* Selected Student Info Badge */}
                {form.studentId && (
                  <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-900">
                          {(() => {
                            const s = students.find(st => st.id === form.studentId);
                            return s ? `${s.firstName} ${s.lastName}` : "Unknown Student";
                          })()}
                        </p>
                        <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-tight">
                          {(() => {
                            const s = students.find(st => st.id === form.studentId);
                            return s ? `Class: ${s.class} | Roll: ${s.rollNumber} | Reg: ${s.regNumber}` : "";
                          })()}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-emerald-400 hover:text-red-500"
                      onClick={() => setForm(prev => ({ ...prev, studentId: "" }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">Item Details</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-8 text-emerald-600"><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[40vh] pr-2">
                  {form.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                      <div className="col-span-5 space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase">Product</Label>
                        <Select value={item.productId} onValueChange={(val) => updateItem(index, "productId", val)}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select Item" /></SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id} disabled={p.stockQuantity <= 0}>
                                {p.productName} (Stock: {p.stockQuantity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Qty</Label>
                        <Input 
                          type="text" 
                          inputMode="numeric"
                          value={item.quantity === 0 ? "" : item.quantity} 
                          onChange={(e) => updateItem(index, "quantity", e.target.value)} 
                          className="h-10 bg-slate-50 border-slate-200 rounded-lg" 
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Price</Label>
                        <Input 
                          type="text" 
                          inputMode="numeric"
                          value={item.unitPrice === 0 ? "" : item.unitPrice} 
                          onChange={(e) => updateItem(index, "unitPrice", e.target.value)} 
                          className="h-10 bg-slate-50 border-slate-200 rounded-lg" 
                        />
                      </div>
                      <div className="col-span-2 text-right pb-2 font-black text-slate-800 text-sm">Rs. {item.total.toLocaleString()}</div>
                      <div className="col-span-1 pb-1">
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Discount (%)</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      name="discount"
                      min="0"
                      max="100"
                      value={form.discount === 0 ? "" : form.discount}
                      onChange={handleChange}
                      className="h-11 bg-emerald-50/30 border-emerald-100 rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Receive Into *</Label>
                    <Select
                      value={form.paymentMethod}
                      onValueChange={(val) => setForm(prev => ({ ...prev, paymentMethod: val }))}
                    >
                      <SelectTrigger className="h-11 bg-emerald-50/30 border-emerald-100 rounded-xl font-bold">
                        <SelectValue placeholder={activeMethods.length === 0 ? "Add a payment method first" : "Select method"} />
                      </SelectTrigger>
                      <SelectContent>
                        {activeMethods.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-slate-500 font-medium">
                            No payment methods configured.
                          </div>
                        ) : (
                          activeMethods.map(m => (
                            <SelectItem key={m.id} value={m.name}>
                              {m.name} — Rs. {Math.round(m.currentBalance).toLocaleString("en-PK")}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {form.paymentMethod && totals.grandTotal > 0 && (
                      <p className="text-[11px] text-slate-500 font-medium">
                        Sale total will be added to <b>{form.paymentMethod}</b>.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Summary */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
                <CardHeader className="bg-slate-800 text-white p-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">Summary</CardTitle>
                </CardHeader>
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                    <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Subtotal</span>
                    <span className="font-bold text-slate-700">Rs. {totals.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                    <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Discount ({form.discount || 0}%)</span>
                    <span className="font-bold text-red-600">- Rs. {totals.discountAmount.toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl shadow-slate-200">
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-1">Net Payable</p>
                    <h2 className="text-4xl font-black">Rs. {totals.grandTotal.toLocaleString()}</h2>
                  </div>
                  <Button onClick={handleSubmit} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]">
                    <Save className="w-4 h-4 mr-2" /> Save & Finalize
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}