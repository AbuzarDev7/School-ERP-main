import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Tag } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useNumericInput } from "@/hooks/useNumericInput"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"

export default function Discount({ open, setOpen, initialData, onSave, loading }) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState(0)
  const { sanitize } = useNumericInput()
  const SAMPLE_FEE = 5000; // Baseline for visual preview

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "")
      setAmount(initialData.amount ?? 0)
    } else {
      setName("")
      setAmount(0)
    }
  }, [initialData, open])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      name: name.trim(),
      amount: Number(amount),
      isRecurring: true,
    })
  }

  const calculatedValue = Number(amount) || 0;
  const discountPercentage = Math.min(100, (calculatedValue / SAMPLE_FEE) * 100);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-120 p-0 overflow-hidden shadow-xl border border-slate-200 rounded-xl bg-white">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Tag size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {initialData ? "Edit Discount" : "Add New Discount"}
              </DialogTitle>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Set up recurring reductions for tuition and fees.
              </p>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Discount Name *</Label>
              <Input
                placeholder="e.g. Sibling Discount"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Monthly Amount *</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount === 0 ? "" : amount}
                onChange={(e) => {
                  const num = sanitize(e.target.value);
                  if (num !== null) setAmount(num);
                }}
                className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                required
              />
            </div>

            {/* Impact Preview */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-end">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Impact Preview (On Rs. {SAMPLE_FEE.toLocaleString()} Fee)</Label>
                <span className="text-xs font-black text-emerald-600">- Rs. {Math.round(calculatedValue).toLocaleString()}</span>
              </div>
              
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div 
                  className={cn("h-full transition-all duration-300 ease-out", discountPercentage > 80 ? "bg-red-500" : (discountPercentage > 50 ? "bg-amber-500" : "bg-emerald-500"))} 
                  style={{ width: `${discountPercentage}%` }}
                />
              </div>
              
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                <span className="text-slate-400">Remaining: <span className="text-slate-600">Rs. {Math.max(0, SAMPLE_FEE - Math.round(calculatedValue)).toLocaleString()}</span></span>
                <span className={cn("transition-colors", discountPercentage > 50 ? "text-amber-600" : "text-slate-400")}>{Math.round(discountPercentage)}% OFF</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-11 px-6 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]">
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : (initialData ? "Update Discount" : "Save Discount")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}