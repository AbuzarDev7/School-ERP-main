import api from "./api"

export const studentService = {
  getAll: async () => {
    const res = await api.get("/students")
    return res.data
  },

  create: async (data) => {
    const res = await api.post("/students", data, { headers: { 'Content-Type': 'multipart/form-data' } })
    return res.data
  },

  update: async (id, data) => {
    const res = await api.put(`/students/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
    return res.data
  },

  delete: async (id, status) => {
    const res = await api.delete(`/students/${id}`, { data: { status } })
    return res.data
  },
}