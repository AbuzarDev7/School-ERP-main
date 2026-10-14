import React, { createContext, useContext, useState, useEffect } from 'react';
import { productService } from '@/services/productService';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

const ProductContext = createContext();

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

export const ProductProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAll();
      setProducts(data);
    } catch (error) {
      toast.error("Connection Error: Unable to reach the inventory server.");
      console.error("Error fetching products", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchProducts();
  }, [isAuthenticated]);

  const addProduct = async (data) => {
    const newData = await productService.create(data);
    setProducts(prev => [...prev, newData]);
    return newData;
  };

  const updateProduct = async (id, data) => {
    const updatedData = await productService.update(id, data);
    setProducts(prev => prev.map(p => p.id === id ? updatedData : p));
    return updatedData;
  };

  const deleteProduct = async (id) => {
    await productService.deleteProduct(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <ProductContext.Provider value={{ products, loading, addProduct, updateProduct, deleteProduct, fetchProducts }}>
      {children}
    </ProductContext.Provider>
  );
};