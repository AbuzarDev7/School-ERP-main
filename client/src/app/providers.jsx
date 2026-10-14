import { StudentProvider } from "@/context/StudentContext"
import { FeeStructureProvider } from "@/context/FeeStructureContext"
import { ProductProvider } from "@/context/ProductContext"
import { InvoiceProvider } from "@/context/InvoiceContext"
import { VoucherProvider } from "@/context/VoucherContext"
import { DiscountProvider } from "@/context/DiscountContext"
import { AuthProvider } from "@/context/AuthContext"
import { WorkerProvider } from "@/context/WorkerContext"
import { PaymentMethodProvider } from "@/context/PaymentMethodContext"
import { ExpenseProvider } from "@/context/ExpenseContext"
import { SettingsProvider } from "@/context/SettingsContext"

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <PaymentMethodProvider>
          <ExpenseProvider>
            <FeeStructureProvider>
              <DiscountProvider>
                <StudentProvider>
                  <VoucherProvider>
                    <WorkerProvider>
                      <ProductProvider>
                        <InvoiceProvider>{children}</InvoiceProvider>
                      </ProductProvider>
                    </WorkerProvider>
                  </VoucherProvider>
                </StudentProvider>
              </DiscountProvider>
            </FeeStructureProvider>
          </ExpenseProvider>
        </PaymentMethodProvider>
      </SettingsProvider>
    </AuthProvider>
  )
}