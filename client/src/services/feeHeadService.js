import api from "./api";

export const feeHeadClient = {
  getAll: async () => {
    const res = await api.get("/fee-heads");
    return res.data;
  },
  create: async (data) => {
    const res = await api.post("/fee-heads", data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/fee-heads/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/fee-heads/${id}`);
    return res.data;
  },
};