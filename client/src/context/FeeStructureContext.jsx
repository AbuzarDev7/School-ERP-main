import { createContext, useContext, useEffect, useState } from "react"
import { feeStructureClient } from "@/services/feeStructureService"
import { feeHeadClient } from "@/services/feeHeadService"
import { toast } from "sonner"
import { useAuth } from "./AuthContext"

const FeeStructureContext = createContext()

export function FeeStructureProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [structures, setStructures] = useState([])
  const [heads, setHeads] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchStructures = async () => {
    setLoading(true)
    try {
      const [structResult, headsResult] = await Promise.allSettled([
        feeStructureClient.getAll(),
        feeHeadClient.getAll()
      ]);

      if (structResult.status === "fulfilled") {
        setStructures(structResult.value)
      } else {
        console.error("Failed to load fee structures:", structResult.reason)
        toast.error("Could not load fee structures.")
      }

      if (headsResult.status === "fulfilled") {
        setHeads(headsResult.value)
      } else {
        console.error("Failed to load fee heads:", headsResult.reason)
      }
    } finally {
      setLoading(false)
    }
  }

  const addStructure = async (formData) => {
    try {
      const created = await feeStructureClient.create(formData)
      setStructures((prev) => [...prev, created])
      return created
    } catch (err) { throw err }
  }

  const updateStructure = async (id, formData) => {
    try {
      const updated = await feeStructureClient.update(id, formData)
      setStructures((prev) => prev.map((s) => (s.id === id ? updated : s)))
      return updated
    } catch (err) { throw err }
  }

  const deleteStructure = async (id) => {
    await feeStructureClient.delete(id)
    setStructures((prev) => prev.filter((s) => s.id !== id))
  }

  useEffect(() => {
    if (!isAuthenticated) return
    fetchStructures()
  }, [isAuthenticated])

  return (
    <FeeStructureContext.Provider
      value={{
        structures,
        heads,
        loading,
        addStructure,
        updateStructure,
        deleteStructure,
        refreshStructures: fetchStructures,
      }}
    >
      {children}
    </FeeStructureContext.Provider>
  )
}

export const useFeeStructures = () => useContext(FeeStructureContext)