"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ProductView } from "./product-view";

export type CartLine = {
  product: ProductView;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  total: number;
  drawerOpen: boolean;
  lastAdded: ProductView | null;
  setDrawerOpen: (open: boolean) => void;
  dismissAddedNotice: () => void;
  addItem: (product: ProductView) => void;
  removeItem: (id: number) => void;
  setQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "woodclay-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<ProductView | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // Hydrating persisted cart state from a browser-only API after mount
      // (never during render, so server and first-client render stay
      // identical) — the standard, SSR-safe escape hatch for this pattern.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setLines(JSON.parse(stored));
    } catch {
      // A blocked storage API should not block shopping.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [hydrated, lines]);

  useEffect(() => {
    if (!lastAdded) return;
    const timeout = window.setTimeout(() => setLastAdded(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [lastAdded]);

  const value = useMemo<CartContextValue>(() => ({
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    total: lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
    drawerOpen,
    lastAdded,
    setDrawerOpen,
    dismissAddedNotice() {
      setLastAdded(null);
    },
    addItem(product) {
      setLines((current) => {
        const existing = current.find((line) => line.product.id === product.id);
        if (existing) {
          return current.map((line) => line.product.id === product.id
            ? { ...line, quantity: Math.min(line.quantity + 1, product.stock) }
            : line);
        }
        return [...current, { product, quantity: 1 }];
      });
      setLastAdded(product);
    },
    removeItem(id) {
      setLines((current) => current.filter((line) => line.product.id !== id));
    },
    setQuantity(id, quantity) {
      setLines((current) => current.map((line) => {
        if (line.product.id !== id) return line;
        return { ...line, quantity: Math.max(1, Math.min(quantity, line.product.stock)) };
      }));
    },
    clearCart() {
      setLines([]);
    },
  }), [drawerOpen, lastAdded, lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
