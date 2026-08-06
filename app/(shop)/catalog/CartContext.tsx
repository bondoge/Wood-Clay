"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
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

function computeAdd(current: CartLine[], product: ProductView): CartLine[] {
  const existing = current.find((line) => line.product.id === product.id);
  if (existing) {
    return current.map((line) => line.product.id === product.id
      ? { ...line, quantity: Math.min(line.quantity + 1, product.stock) }
      : line);
  }
  return [...current, { product, quantity: 1 }];
}

function computeSetQuantity(current: CartLine[], id: number, quantity: number): CartLine[] {
  return current.map((line) => {
    if (line.product.id !== id) return line;
    return { ...line, quantity: Math.max(1, Math.min(quantity, line.product.stock)) };
  });
}

function computeRemove(current: CartLine[], id: number): CartLine[] {
  return current.filter((line) => line.product.id !== id);
}

async function postJson(url: string, body: unknown): Promise<{ lines: CartLine[] } | null> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.cart ?? null;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<ProductView | null>(null);

  // Guests keep the browser-only cart (localStorage). Logged-in users get a
  // cart persisted in Postgres via /api/cart* — the server response is the
  // source of truth from here on. On the transition into "authenticated"
  // (fresh login, or a page load that's already logged in), any leftover
  // localStorage lines are merged into the server cart first so nothing
  // added while browsing as a guest is silently lost.
  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;

    if (status === "unauthenticated") {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLines(stored ? JSON.parse(stored) : []);
      } catch {
        // A blocked storage API should not block shopping.
        setLines([]);
      }
      setReady(true);
      return;
    }

    (async () => {
      let guestLines: CartLine[] = [];
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) guestLines = JSON.parse(stored);
      } catch {
        // ignore — nothing to merge
      }

      if (guestLines.length > 0) {
        await postJson("/api/cart/merge", {
          items: guestLines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        });
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      }

      const res = await fetch("/api/cart").catch(() => null);
      if (cancelled) return;
      if (res?.ok) {
        const data = await res.json().catch(() => null);
        if (data?.cart) setLines(data.cart.lines);
      }
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (!ready || status !== "unauthenticated") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [ready, status, lines]);

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
      if (status === "loading") return;
      setLines((current) => computeAdd(current, product));
      setLastAdded(product);
      if (status === "authenticated") {
        postJson("/api/cart/items", { productId: product.id, quantity: 1 }).then((cart) => {
          if (cart) setLines(cart.lines);
        });
      }
    },
    removeItem(id) {
      if (status === "loading") return;
      setLines((current) => computeRemove(current, id));
      if (status === "authenticated") {
        fetch(`/api/cart/items/${id}`, { method: "DELETE" })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.cart) setLines(data.cart.lines);
          })
          .catch(() => {});
      }
    },
    setQuantity(id, quantity) {
      if (status === "loading") return;
      setLines((current) => computeSetQuantity(current, id, quantity));
      if (status === "authenticated") {
        fetch(`/api/cart/items/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: Math.max(1, quantity) }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.cart) setLines(data.cart.lines);
          })
          .catch(() => {});
      }
    },
    clearCart() {
      if (status === "loading") return;
      setLines([]);
      if (status === "authenticated") {
        fetch("/api/cart", { method: "DELETE" }).catch(() => {});
      }
    },
  }), [drawerOpen, lastAdded, lines, status]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
