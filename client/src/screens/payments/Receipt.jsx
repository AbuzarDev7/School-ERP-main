export default function Receipt({ payment }) {
  if (!payment) return null

  return (
    <div className="bg-white p-6 border rounded-lg mt-4">
      <h3 className="text-lg font-semibold mb-4">
        Payment Receipt
      </h3>

      <div className="text-sm space-y-2">
        <p><strong>Student:</strong> {payment.student}</p>
        <p><strong>Voucher:</strong> {payment.voucher}</p>
        <p><strong>Amount Paid:</strong> {payment.amount}</p>
        <p><strong>Method:</strong> {payment.method}</p>
        <p className="text-green-600 font-medium">Status: SUCCESS</p>
      </div>
    </div>
  )
}