import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Settings2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

export default function FeeHeadForm({ open, setOpen, initialData, onSave, loading }) {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState(0)

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[480px] p-0 overflow-hidden shadow-xl border border-slate-200 rounded-xl bg-white">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b bg-slate-50/50 flex items-center gap-4 shrink-0">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Settings2 size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {initialData ? "Edit Fee Head" : "Add New Fee Head"}
              </DialogTitle>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {initialData ? "Update the details of this fee category." : "Define a new base fee category."}
              </p>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Fee Head Name *</Label>
              <Input
                placeholder="e.g. Tuition Fee"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">Default Amount *</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                required
              />
            </div>
          </div>

          <div className="px-6 py-5 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-11 px-6 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]">
              {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              {initialData ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}