import api from "./api";

export const feeStructureClient = {
  getAll: async () => {
    const res = await api.get("/fee-structures");
    return res.data;
  },
  create: async (data) => {
    const res = await api.post("/fee-structures", data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/fee-structures/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/fee-structures/${id}`);
    return res.data;
  },
};