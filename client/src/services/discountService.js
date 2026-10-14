import api from "./api";

export const discountClient = {
  getAll: async () => {
    const res = await api.get("/discounts");
    return res.data;
  },
  create: async (data) => {
    const res = await api.post("/discounts", data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/discounts/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/discounts/${id}`);
    return res.data;
  },
};