import api from "./api";

export const voucherClient = {
  getAll: async () => (await api.get("/fee-vouchers")).data,
  create: async (data) => (await api.post("/fee-vouchers", data)).data,
  updateStatus: async (id, payload) =>
    (await api.patch(`/fee-vouchers/${id}/status`, payload)).data,
  edit: async (id, payload) =>
    (await api.patch(`/fee-vouchers/${id}`, payload)).data,
  delete: async (id) => (await api.delete(`/fee-vouchers/${id}`)).data,
  createBulk: async (vouchers) => {
    const res = await api.post("/fee-vouchers/bulk", { vouchers });
    return res.data;
  },
};