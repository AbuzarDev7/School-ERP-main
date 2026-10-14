import api from "./api";

const URL = "payment-methods";

export const getAllPaymentMethods = async ({ includeArchived = false } = {}) => {
  const response = await api.get(URL, { params: { includeArchived } });
  return response.data;
};

export const createPaymentMethod = async (data) => {
  const response = await api.post(URL, data);
  return response.data;
};

export const updatePaymentMethod = async (id, data) => {
  const response = await api.put(`${URL}/${id}`, data);
  return response.data;
};

export const archivePaymentMethod = async (id) => {
  const response = await api.put(`${URL}/${id}/archive`);
  return response.data;
};

export const unarchivePaymentMethod = async (id) => {
  const response = await api.put(`${URL}/${id}/unarchive`);
  return response.data;
};

export const getTransfers = async (params = {}) => {
  const response = await api.get(`${URL}/transfers`, { params });
  return response.data;
};

export const createTransfer = async (data) => {
  const response = await api.post(`${URL}/transfers`, data);
  return response.data;
};

export const deleteTransfer = async (id) => {
  const response = await api.delete(`${URL}/transfers/${id}`);
  return response.data;
};
