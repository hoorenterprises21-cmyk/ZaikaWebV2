import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Product } from '../types';
import { effectivePrice } from './settings';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (product: Product, qty?: number) => void;
  remove: (productId: number) => void;
  setQty: (productId: number, qty: number) => void;
  clear: () => void;
  getQty: (productId: number) => number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = 'fh_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add: CartContextValue['add'] = (product, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.product.id === product.id);
      if (found) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i,
        );
      }
      return [...prev, { product, quantity: qty }];
    });
  };

  const remove: CartContextValue['remove'] = (productId) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const setQty: CartContextValue['setQty'] = (productId, qty) => {
    if (qty <= 0) {
      remove(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i)),
    );
  };

  const clear = () => setItems([]);

  const getQty = (productId: number) =>
    items.find((i) => i.product.id === productId)?.quantity ?? 0;

  const memo = useMemo<CartContextValue>(() => ({
    items, add, remove, setQty, clear, getQty,
    count: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: items.reduce((s, i) => s + effectivePrice(i.product) * i.quantity, 0),
  }), [items]);

  return <CartContext.Provider value={memo}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
}
