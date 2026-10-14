import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as workerService from '@/services/workerService'; // Assuming you'll create this
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

const WorkerContext = createContext();

export const WorkerProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Per-worker full-history cache. The main `workers` list only carries the
  // currently-selected month's nested data; history views need every month,
  // which is too heavy to ship in the list response. We lazily fetch full
  // records keyed by worker id, dedupe concurrent requests, and invalidate
  // on any mutation so consumers always see fresh data.
  const [workerHistories, setWorkerHistories] = useState({});
  const inflightHistoryRef = useRef({});

  const loadWorkerHistory = useCallback(async (id, { force = false } = {}) => {
    if (!id) return null;
    if (!force && workerHistories[id]) return workerHistories[id];
    if (inflightHistoryRef.current[id]) return inflightHistoryRef.current[id];

    const promise = workerService.getWorkerById(id)
      .then((data) => {
        setWorkerHistories((prev) => ({ ...prev, [id]: data }));
        return data;
      })
      .finally(() => {
        delete inflightHistoryRef.current[id];
      });

    inflightHistoryRef.current[id] = promise;
    return promise;
  }, [workerHistories]);

  // Cheaper than tracking which worker each mutation touches; the cache is
  // only ever populated for workers the user has opened in the history modal.
  const invalidateAllHistories = useCallback(() => {
    setWorkerHistories({});
  }, []);

  const fetchWorkers = useCallback(async (month = selectedMonth) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedWorkers = await workerService.getAllWorkers(month);
      setWorkers(fetchedWorkers);
    } catch (err) {
      setError(err);
      toast.error("Failed to load worker data.");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchWorkers(selectedMonth);
  }, [isAuthenticated, fetchWorkers, selectedMonth]);

  const addWorker = async (workerData, photoFile) => {
    try {
      const newWorker = await workerService.createWorker(workerData, photoFile);
      setWorkers(prev => [...prev, newWorker]);
      toast.success("Worker added successfully!");
      return newWorker;
    } catch (err) {
      console.error("Failed to add worker:", err);
      toast.error(err.response?.data?.error || "Failed to add worker.");
      throw err;
    }
  };

  const updateWorker = async (id, workerData, photoFile) => {
    try {
      const updatedWorker = await workerService.updateWorker(id, workerData, photoFile);
      setWorkers(prev => prev.map(w => (w.id === id ? updatedWorker : w)));
      invalidateAllHistories();
      toast.success("Worker updated successfully!");
      return updatedWorker;
    } catch (err) {
      console.error("Failed to update worker:", err);
      toast.error(err.response?.data?.error || "Failed to update worker.");
      throw err;
    }
  };

  const deleteWorker = async (id) => {
    try {
      const updatedWorker = await workerService.deleteWorker(id);
      setWorkers(prev => prev.map(w => w.id === id ? updatedWorker : w));
      invalidateAllHistories();
      toast.success("Worker moved to Inactive status");
    } catch (err) {
      console.error("Failed to delete worker:", err);
      toast.error(err.response?.data?.error || "Failed to delete worker.");
      throw err;
    }
  };

  const reactivateWorker = async (id) => {
    try {
      const updatedWorker = await workerService.reactivateWorker(id);
      setWorkers(prev => prev.map(w => (w.id === id ? updatedWorker : w)));
      invalidateAllHistories();
      toast.success("Worker reactivated successfully!");
      return updatedWorker;
    } catch (err) {
      console.error("Failed to reactivate worker:", err);
      toast.error(err.response?.data?.error || "Failed to reactivate worker.");
      throw err;
    }
  };

  const addPayment = async (paymentData) => {
    try {
      const newPayment = await workerService.createPayment(paymentData);
      await fetchWorkers(selectedMonth);
      invalidateAllHistories();
      toast.success("Salary paid successfully!");
      return newPayment;
    } catch (err) {
      console.error("Failed to add payment:", err);
      toast.error(err.response?.data?.error || "Failed to record payment.");
      throw err;
    }
  };

  const undoPayment = async (paymentId) => {
    try {
      await workerService.undoPayment(paymentId);
      await fetchWorkers(selectedMonth);
      invalidateAllHistories();
      toast.success("Payment reverted successfully.");
    } catch (err) {
      console.error("Failed to undo payment:", err);
      toast.error("Failed to revert payment.");
      throw err;
    }
  };

  const addAdvance = async (advanceData) => {
    try {
      const newAdvance = await workerService.createAdvance(advanceData);
      await fetchWorkers(selectedMonth);
      invalidateAllHistories();
      toast.success("Advance recorded successfully!");
      return newAdvance;
    } catch (err) {
      console.error("Failed to add advance:", err);
      toast.error(err.response?.data?.error || "Failed to record advance.");
      throw err;
    }
  };

  const updateAdvance = async (id, advanceData) => {
    try {
      const updated = await workerService.updateAdvance(id, advanceData);
      await fetchWorkers(selectedMonth);
      invalidateAllHistories();
      toast.success("Advance updated successfully!");
      return updated;
    } catch (err) {
      console.error("Failed to update advance:", err);
      toast.error(err.response?.data?.error || "Failed to update advance.");
      throw err;
    }
  };

  const deleteAdvance = async (id) => {
    try {
      await workerService.deleteAdvance(id);
      await fetchWorkers(selectedMonth);
      invalidateAllHistories();
      toast.success("Advance removed successfully!");
    } catch (err) {
      console.error("Failed to delete advance:", err);
      toast.error(err.response?.data?.error || "Failed to delete advance.");
      throw err;
    }
  };

  const addExtraHours = async (data) => {
    try {
      const entry = await workerService.createExtraHours(data);
      await fetchWorkers(selectedMonth);
      invalidateAllHistories();
      toast.success("Overtime recorded.");
      return entry;
    } catch (err) {
      toast.error("Failed to record overtime.");
      throw err;
    }
  };

  const updateExtraHours = async (id, data) => {
    try {
      const updated = await workerService.updateExtraHours(id, data);
      await fetchWorkers(selectedMonth);
      invalidateAllHistories();
      toast.success("Overtime updated.");
      return updated;
    } catch (err) {
      toast.error("Failed to update overtime.");
      throw err;
    }
  };

  const deleteExtraHours = async (id) => {
    try {
      await workerService.deleteExtraHours(id);
      await fetchWorkers(selectedMonth);
      invalidateAllHistories();
      toast.success("Overtime entry removed.");
    } catch (err) {
      toast.error("Failed to delete entry.");
      throw err;
    }
  };

  const getPayrollContext = async (workerId, month) => {
    return workerService.getPayrollContext(workerId, month);
  };

  const value = {
    workers,
    loading,
    error,
    selectedMonth,
    setSelectedMonth,
    fetchWorkers,
    addWorker,
    updateWorker,
    deleteWorker,
    reactivateWorker,
    addPayment,
    undoPayment,
    addAdvance,
    updateAdvance,
    deleteAdvance,
    addExtraHours,
    updateExtraHours,
    deleteExtraHours,
    getPayrollContext,
    workerHistories,
    loadWorkerHistory,
    invalidateAllHistories,
  };

  return (
    <WorkerContext.Provider value={value}>
      {children}
    </WorkerContext.Provider>
  );
};

export const useWorkers = () => {
  const context = useContext(WorkerContext);
  if (context === undefined) {
    throw new Error('useWorkers must be used within a WorkerProvider');
  }
  return context;
};