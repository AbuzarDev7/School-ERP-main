import { createContext, useContext, useEffect, useState } from "react"
import { discountClient } from "@/services/discountService"
import { toast } from "sonner"
import { useAuth } from "./AuthContext"

const DiscountContext = createContext()

export function DiscountProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchDiscounts = async () => {
    setLoading(true)
    try {
      const data = await discountClient.getAll()
      setDiscounts(data)
    } catch (err) {
      toast.error("Connection Error: Unable to reach the server.")
      console.error("Failed to load discounts:", err)
    } finally {
      setLoading(false)
    }
  }

  const addDiscount = async (formData) => {
    const created = await discountClient.create(formData)
    setDiscounts((prev) => [...prev, created])
    return created
  }

  const updateDiscount = async (id, formData) => {
    const updated = await discountClient.update(id, formData)
    setDiscounts((prev) => prev.map((d) => (d.id === id ? updated : d)))
    return updated
  }

  const deleteDiscount = async (id) => {
    await discountClient.delete(id)
    setDiscounts((prev) => prev.filter((d) => d.id !== id))
  }

  useEffect(() => {
    if (!isAuthenticated) return
    fetchDiscounts()
  }, [isAuthenticated])

  return (
    <DiscountContext.Provider
      value={{
        discounts,
        loading,
        addDiscount,
        updateDiscount,
        deleteDiscount,
        refreshDiscounts: fetchDiscounts,
      }}
    >
      {children}
    </DiscountContext.Provider>
  )
}

export const useDiscounts = () => useContext(DiscountContext)