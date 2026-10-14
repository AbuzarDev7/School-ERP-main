import { createContext, useContext, useEffect, useState } from "react"
import { studentService } from "@/services/studentService"
import { toast } from "sonner"
import { useAuth } from "./AuthContext"

const StudentContext = createContext()

export function StudentProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchStudents = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await studentService.getAll()
      setStudents(data)
    } catch (err) {
      const msg = "Connection Error: Unable to reach the server."
      setError(msg)
      toast.error(msg)
      console.error("Failed to load students:", err)
    } finally {
      setLoading(false)
    }
  }

  const addStudent = async (formData) => {
    // studentService.create sends FormData, and expects a JSON response from the backend
    try {
      const created = await studentService.create(formData)
      setStudents((prev) => [...prev, created])
      return created
    } catch (err) {
      console.error("Add student error details:", err.response?.data)
      toast.error(err.response?.data?.error || "Failed to add student")
      throw err
    }
  }

  const updateStudent = async (id, formData) => {
    // studentService.update sends FormData, and expects a JSON response from the backend
    try {
      const updated = await studentService.update(id, formData)
      setStudents((prev) => prev.map((s) => (s.id === id ? updated : s)))
      return updated
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update student")
      throw err
    }
  }

  const deleteStudent = async (id, status) => {
    const updated = await studentService.delete(id, status)
    setStudents((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }

  // Bootstrap fetch is gated on auth so the initial render on the login page
  // doesn't issue a 401 against the protected API. Re-fires when the user
  // logs in (isAuthenticated false → true).
  useEffect(() => {
    if (!isAuthenticated) return
    fetchStudents()
  }, [isAuthenticated])

  return (
    <StudentContext.Provider value={{ students, loading, error, addStudent, updateStudent, deleteStudent, refreshStudents: fetchStudents }}>
      {children}
    </StudentContext.Provider>
  )
}

export const useStudents = () => useContext(StudentContext)