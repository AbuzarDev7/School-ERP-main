import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import DataTable from "@/components/shared/DataTable"
import PaymentForm from "./PaymentForm"
import Receipt from "./Receipt"

export default function Payments() {
  const [open, setOpen] = useState(false)
  const [payments, setPayments] = useState([])
  const [selectedPayment, setSelectedPayment] = useState(null)

  /////////////////////////////
  // Handle Save
  /////////////////////////////
  const handleSave = (data) => {
    const newPayment = {
      ...data,
      status: "SUCCESS",
      id: Date.now(),
    }

    setPayments([newPayment, ...payments])
    setSelectedPayment(newPayment)
  }

  /////////////////////////////

  const columns = [
    { header: "Student", accessor: "student" },
    { header: "Voucher", accessor: "voucher" },
    { header: "Amount", accessor: "amount" },
    { header: "Method", accessor: "method" },
    {
      header: "Status",
      render: (row) => (
        <Badge>{row.status}</Badge>
      ),
    },
    {
      header: "Action",
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelectedPayment(row)}
        >
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Payments</h2>
        <Button onClick={() => setOpen(true)}>
          + Add Payment
        </Button>
      </div>

      {/* Table */}
      <DataTable columns={columns} data={payments} />

      {/* Receipt */}
      <Receipt payment={selectedPayment} />

      {/* Modal */}
      <PaymentForm
        open={open}
        setOpen={setOpen}
        onSave={handleSave}
      />
    </div>
  )
}