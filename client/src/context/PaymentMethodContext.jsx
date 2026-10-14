import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as svc from "@/services/paymentMethodService";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

const PaymentMethodContext = createContext();

export const PaymentMethodProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [methods, setMethods] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMethods = useCallback(async ({ includeArchived = false } = {}) => {
    try {
      const data = await svc.getAllPaymentMethods({ includeArchived });
      setMethods(data);
    } catch (err) {
      setError(err);
    }
  }, []);

  const fetchTransfers = useCallback(async (params = {}) => {
    try {
      const data = await svc.getTransfers(params);
      setTransfers(data);
    } catch (err) {
      setError(err);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchMethods({ includeArchived: true }), fetchTransfers()]);
    } finally {
      setLoading(false);
    }
  }, [fetchMethods, fetchTransfers]);

  useEffect(() => {
    if (!isAuthenticated) return;
    refresh();
  }, [isAuthenticated, refresh]);

  const addMethod = async (data) => {
    try {
      const created = await svc.createPaymentMethod(data);
      await refresh();
      toast.success(`"${created.name}" added`);
      return created;
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add payment method");
      throw err;
    }
  };

  const editMethod = async (id, data) => {
    try {
      const updated = await svc.updatePaymentMethod(id, data);
      await refresh();
      toast.success("Payment method updated");
      return updated;
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update method");
      throw err;
    }
  };

  const archiveMethod = async (id) => {
    try {
      await svc.archivePaymentMethod(id);
      await refresh();
      toast.success("Method archived");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to archive method");
      throw err;
    }
  };

  const unarchiveMethod = async (id) => {
    try {
      await svc.unarchivePaymentMethod(id);
      await refresh();
      toast.success("Method restored");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to restore method");
      throw err;
    }
  };

  const transfer = async (data) => {
    try {
      const created = await svc.createTransfer(data);
      await refresh();
      toast.success("Transfer recorded");
      return created;
    } catch (err) {
      toast.error(err.response?.data?.error || "Transfer failed");
      throw err;
    }
  };

  const removeTransfer = async (id) => {
    try {
      await svc.deleteTransfer(id);
      await refresh();
      toast.success("Transfer removed");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to remove transfer");
      throw err;
    }
  };

  const value = {
    methods,
    activeMethods: methods.filter((m) => !m.archived),
    transfers,
    loading,
    error,
    refresh,
    addMethod,
    editMethod,
    archiveMethod,
    unarchiveMethod,
    transfer,
    removeTransfer,
  };

  return (
    <PaymentMethodContext.Provider value={value}>
      {children}
    </PaymentMethodContext.Provider>
  );
};

export const usePaymentMethods = () => {
  const ctx = useContext(PaymentMethodContext);
  if (!ctx) throw new Error("usePaymentMethods must be used within a PaymentMethodProvider");
  return ctx;
};
