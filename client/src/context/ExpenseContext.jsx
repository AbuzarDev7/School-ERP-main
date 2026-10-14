import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as svc from "@/services/expenseService";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

const ExpenseContext = createContext();

export const ExpenseProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [heads, setHeads] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHeads = useCallback(async ({ includeArchived = true } = {}) => {
    try {
      const data = await svc.getHeads({ includeArchived });
      setHeads(data);
    } catch (err) {
      setError(err);
    }
  }, []);

  const fetchExpenses = useCallback(async (params = {}) => {
    try {
      const data = await svc.getExpenses(params);
      setExpenses(data);
    } catch (err) {
      setError(err);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchHeads(), fetchExpenses()]);
    } finally {
      setLoading(false);
    }
  }, [fetchHeads, fetchExpenses]);

  useEffect(() => {
    if (!isAuthenticated) return;
    refresh();
  }, [isAuthenticated, refresh]);

  // Heads actions
  const addHead = async (data) => {
    try {
      const created = await svc.createHead(data);
      await fetchHeads();
      toast.success(`"${created.name}" added`);
      return created;
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add head");
      throw err;
    }
  };

  const editHead = async (id, data) => {
    try {
      const updated = await svc.updateHead(id, data);
      await fetchHeads();
      toast.success("Head updated");
      return updated;
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update head");
      throw err;
    }
  };

  const archiveHead = async (id) => {
    try {
      await svc.archiveHead(id);
      await fetchHeads();
      toast.success("Head archived");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to archive head");
      throw err;
    }
  };

  const unarchiveHead = async (id) => {
    try {
      await svc.unarchiveHead(id);
      await fetchHeads();
      toast.success("Head restored");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to restore head");
      throw err;
    }
  };

  const removeHead = async (id) => {
    try {
      await svc.deleteHead(id);
      await fetchHeads();
      toast.success("Head deleted");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete head");
      throw err;
    }
  };

  // Expense actions
  const addExpense = async (data) => {
    try {
      const created = await svc.createExpense(data);
      await fetchExpenses();
      toast.success(`Expense recorded — Rs ${Math.round(created.amount).toLocaleString("en-PK")}`);
      return created;
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to record expense");
      throw err;
    }
  };

  const editExpense = async (id, data) => {
    try {
      const updated = await svc.updateExpense(id, data);
      await fetchExpenses();
      toast.success("Expense updated");
      return updated;
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update expense");
      throw err;
    }
  };

  const removeExpense = async (id) => {
    try {
      await svc.deleteExpense(id);
      await fetchExpenses();
      toast.success("Expense removed");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete expense");
      throw err;
    }
  };

  const value = {
    heads,
    activeHeads: heads.filter((h) => !h.archived),
    archivedHeads: heads.filter((h) => h.archived),
    expenses,
    loading,
    error,
    refresh,
    fetchExpenses,
    addHead,
    editHead,
    archiveHead,
    unarchiveHead,
    removeHead,
    addExpense,
    editExpense,
    removeExpense,
  };

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
};

export const useExpenses = () => {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error("useExpenses must be used within an ExpenseProvider");
  return ctx;
};
