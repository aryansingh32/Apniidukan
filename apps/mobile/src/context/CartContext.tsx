import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  addCartItem,
  clearCart as clearCartApi,
  getCart,
  removeCartItem,
  reorder as reorderApi,
  updateCartItem,
} from '@/lib/endpoints';
import { isApiError } from '@/lib/api';
import type { Cart } from '@/lib/types';
import { useAuth } from './AuthContext';

interface CartContextValue {
  cart: Cart | null;
  itemCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (productId: string, caseQty: number) => Promise<void>;
  updateItem: (productId: string, caseQty: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
  reorderFrom: (orderId: string) => Promise<string[]>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { authStatus } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await getCart();
      setCart(c);
    } catch (e) {
      if (isApiError(e) && e.statusCode !== 403) {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'approved') {
      refresh();
    } else {
      setCart(null);
    }
  }, [authStatus, refresh]);

  const addItem = useCallback(async (productId: string, caseQty: number) => {
    const c = await addCartItem(productId, caseQty);
    setCart(c);
  }, []);

  const updateItem = useCallback(async (productId: string, caseQty: number) => {
    const c = await updateCartItem(productId, caseQty);
    setCart(c);
  }, []);

  const removeItem = useCallback(async (productId: string) => {
    const c = await removeCartItem(productId);
    setCart(c);
  }, []);

  const clear = useCallback(async () => {
    const c = await clearCartApi();
    setCart(c);
  }, []);

  const reorderFrom = useCallback(async (orderId: string) => {
    const c = await reorderApi(orderId);
    setCart(c);
    return c.unavailableProducts ?? [];
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      itemCount: cart?.itemCount ?? 0,
      loading,
      error,
      refresh,
      addItem,
      updateItem,
      removeItem,
      clear,
      reorderFrom,
    }),
    [cart, loading, error, refresh, addItem, updateItem, removeItem, clear, reorderFrom]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
