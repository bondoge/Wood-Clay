// Яндекс.Метрика ecommerce events — UA-style Enhanced Ecommerce dataLayer
// schema (detail/add/remove/checkout/purchase), same format GTM/GA popularized
// and what Метрика's ecommerce module expects (see YandexMetrika.tsx's
// ym(id,"init",{ ecommerce:"dataLayer" }) — that's what tells it to watch
// window.dataLayer for these pushes). Plain module, no "use client" needed:
// every window access is inside a function body, same SSR-safe shape as
// lib/consent.ts.
import { getMetrikaCounterId, isTrackableHost, readConsentCookie } from "@/lib/consent";
import type { CartLine } from "@/app/(shop)/catalog/CartContext";
import type { ProductView } from "@/app/(shop)/catalog/product-view";
import type { OrderSummary } from "@/lib/orders";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const PURCHASE_TRACKED_KEY = "wc_purchase_tracked";

// Same gate as YandexMetrika's own rendering: no counter id, a denied
// (explicit opt-out) consent, or a local/dev host all mean "send nothing."
// Returns whether the event was actually pushed, so callers with their own
// idempotency guard (trackPurchase) only persist that guard once something
// was truly sent.
function pushEcommerceEvent(payload: Record<string, unknown>): boolean {
  if (typeof window === "undefined") return false;
  if (!getMetrikaCounterId() || !isTrackableHost()) return false;
  if (readConsentCookie() === "denied") return false;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: { currencyCode: "RUB", ...payload } });
  return true;
}

export function trackProductView(product: ProductView) {
  pushEcommerceEvent({
    detail: {
      products: [
        { id: String(product.id), name: product.title, price: product.price, category: product.style },
      ],
    },
  });
}

export function trackAddToCart(product: ProductView, quantity: number) {
  pushEcommerceEvent({
    add: {
      products: [
        { id: String(product.id), name: product.title, price: product.price, category: product.style, quantity },
      ],
    },
  });
}

export function trackRemoveFromCart(product: ProductView, quantity: number) {
  pushEcommerceEvent({
    remove: {
      products: [
        { id: String(product.id), name: product.title, category: product.style, quantity },
      ],
    },
  });
}

export function trackBeginCheckout(lines: CartLine[]) {
  pushEcommerceEvent({
    checkout: {
      actionField: { step: 1 },
      products: lines.map((line) => ({
        id: String(line.product.id),
        name: line.product.title,
        price: line.product.price,
        category: line.product.style,
        quantity: line.quantity,
      })),
    },
  });
}

function readTrackedPurchaseIds(): number[] {
  try {
    const raw = window.localStorage.getItem(PURCHASE_TRACKED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Guards on order id so a reloaded/revisited confirmation page never
// double-counts revenue. Only marks the order as reported once the event
// actually sent (pushEcommerceEvent returned true) — if analytics is
// currently denied, we deliberately leave it unmarked so a later consent
// grant + revisit can still report it, instead of silently losing it.
export function trackPurchase(order: OrderSummary) {
  if (typeof window === "undefined") return;

  const tracked = readTrackedPurchaseIds();
  if (tracked.includes(order.id)) return;

  const sent = pushEcommerceEvent({
    purchase: {
      actionField: { id: String(order.id), revenue: order.totalRub, shipping: order.shippingCostRub ?? 0 },
      products: order.items.map((item) => ({
        id: item.productId !== null ? String(item.productId) : item.slug,
        name: item.title,
        price: item.priceRub,
        quantity: item.quantity,
      })),
    },
  });
  if (!sent) return;

  try {
    window.localStorage.setItem(PURCHASE_TRACKED_KEY, JSON.stringify([...tracked, order.id]));
  } catch {
    // Best-effort — this purchase still reported once just now even if the
    // guard itself couldn't persist (e.g. storage blocked/full).
  }
}
