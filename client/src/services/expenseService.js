import api from "./api";

const URL = "expenses";

// Heads
export const getHeads = async ({ includeArchived = false } = {}) => {
  const response = await api.get(`${URL}/heads`, { params: { includeArchived } });
  return response.data;
};

export const createHead = async (data) => {
  const response = await api.post(`${URL}/heads`, data);
  return response.data;
};

export const updateHead = async (id, data) => {
  const response = await api.put(`${URL}/heads/${id}`, data);
  return response.data;
};

export const archiveHead = async (id) => {
  const response = await api.put(`${URL}/heads/${id}/archive`);
  return response.data;
};

export const unarchiveHead = async (id) => {
  const response = await api.put(`${URL}/heads/${id}/unarchive`);
  return response.data;
};

export const deleteHead = async (id) => {
  const response = await api.delete(`${URL}/heads/${id}`);
  return response.data;
};

// Expenses
export const getExpenses = async (params = {}) => {
  const response = await api.get(URL, { params });
  return response.data;
};

export const createExpense = async (data) => {
  const response = await api.post(URL, data);
  return response.data;
};

export const updateExpense = async (id, data) => {
  const response = await api.put(`${URL}/${id}`, data);
  return response.data;
};

export const deleteExpense = async (id) => {
  const response = await api.delete(`${URL}/${id}`);
  return response.data;
};
