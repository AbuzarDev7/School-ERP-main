import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/services/api';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

const InvoiceContext = createContext();

export const useInvoices = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error("useInvoices must be used within an InvoiceProvider. Check your App.jsx or main.jsx.");
  }
  return context;
};

export const InvoiceProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get("/invoices");
      // Ensure we always set an array, even if the API structure varies
      setInvoices(Array.isArray(res.data) ? res.data : (res.data?.invoices || []));
    } catch (error) {
      toast.error("Connection Error: Unable to reach the billing server.");
      console.error("Error fetching invoices", error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchInvoices();
  }, [isAuthenticated]);

  const addInvoice = async (data) => {
    const res = await api.post("/invoices", data);
    setInvoices(prev => [...prev, res.data]);
    return res.data;
  };

  const updateInvoice = async (id, data) => {
    const res = await api.put(`/invoices/${id}`, data);
    setInvoices(prev => prev.map(inv => inv.id === id ? res.data : inv));
    return res.data;
  };

  const deleteInvoice = async (id) => {
    await api.delete(`/invoices/${id}`);
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  return (
    <InvoiceContext.Provider value={{ invoices, loading, addInvoice, updateInvoice, deleteInvoice, fetchInvoices }}>
      {children}
    </InvoiceContext.Provider>
  );
};