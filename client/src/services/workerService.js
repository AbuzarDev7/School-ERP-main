import api from './api';

const API_URL = 'workers';

export const getAllWorkers = async (month = null) => {
  const params = month ? { month } : {};
  const response = await api.get(API_URL, { params });
  return response.data;
};

export const getWorkerById = async (id) => {
  const response = await api.get(`${API_URL}/${id}`);
  return response.data;
};

const buildWorkerFormData = (workerData, photoFile) => {
  const fd = new FormData();
  Object.entries(workerData).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, v);
  });
  fd.append('image', photoFile);
  return fd;
};

export const createWorker = async (workerData, photoFile = null) => {
  if (photoFile) {
    const response = await api.post(API_URL, buildWorkerFormData(workerData, photoFile));
    return response.data;
  }
  const response = await api.post(API_URL, workerData);
  return response.data;
};

export const updateWorker = async (id, workerData, photoFile = null) => {
  if (photoFile) {
    const response = await api.put(`${API_URL}/${id}`, buildWorkerFormData(workerData, photoFile));
    return response.data;
  }
  const response = await api.put(`${API_URL}/${id}`, workerData);
  return response.data;
};

export const deleteWorker = async (id) => {
  const response = await api.delete(`${API_URL}/${id}`);
  return response.data;
};

export const reactivateWorker = async (id) => {
  const response = await api.put(`${API_URL}/${id}/reactivate`);
  return response.data;
};

export const getPayrollContext = async (workerId, month) => {
  const response = await api.get(`${API_URL}/${workerId}/payroll-context`, { params: { month } });
  return response.data;
};

export const createPayment = async (paymentData) => {
  const response = await api.post(`${API_URL}/payments`, paymentData);
  return response.data;
};

export const undoPayment = async (paymentId) => {
  const response = await api.delete(`${API_URL}/payments/${paymentId}/undo`);
  return response.data;
};

export const createAdvance = async (advanceData) => {
  const response = await api.post(`${API_URL}/advances`, advanceData);
  return response.data;
};

export const updateAdvance = async (id, advanceData) => {
  const response = await api.put(`${API_URL}/advances/${id}`, advanceData);
  return response.data;
};

export const deleteAdvance = async (id) => {
  const response = await api.delete(`${API_URL}/advances/${id}`);
  return response.data;
};

export const createExtraHours = async (extraHoursData) => {
  const response = await api.post(`${API_URL}/extra-hours`, extraHoursData);
  return response.data;
};

export const updateExtraHours = async (id, extraHoursData) => {
  const response = await api.put(`${API_URL}/extra-hours/${id}`, extraHoursData);
  return response.data;
};

export const deleteExtraHours = async (id) => {
  const response = await api.delete(`${API_URL}/extra-hours/${id}`);
  return response.data;
};
