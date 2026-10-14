import api from "./api"

export const productService = {
  getAll: async () => {
    const res = await api.get("/products")
    return res.data
  },

  create: async (data) => {
    const res = await api.post("/products", data)
    return res.data
  },

  update: async (id, data) => {
    const res = await api.put(`/products/${id}`, data)
    return res.data
  },

  deleteProduct: async (id) => {
    const res = await api.delete(`/products/${id}`)
    return res.data
  },
}