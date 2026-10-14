import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

export default function PaymentForm({ open, setOpen, onSave }) {
  const [form, setForm] = useState({
    student: "",
    voucher: "",
    amount: "",
    method: "CASH",
  })

  const handleSubmit = () => {
    onSave(form)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Input
            placeholder="Student Name"
            onChange={(e) =>
              setForm({ ...form, student: e.target.value })
            }
          />

          <Input
            placeholder="Voucher ID"
            onChange={(e) =>
              setForm({ ...form, voucher: e.target.value })
            }
          />

          <Input
            placeholder="Amount"
            type="number"
            onChange={(e) =>
              setForm({ ...form, amount: e.target.value })
            }
          />

          <Select
            onValueChange={(val) =>
              setForm({ ...form, method: val })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="BANK">Bank</SelectItem>
              <SelectItem value="ONLINE">Online</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleSubmit}>Save Payment</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}