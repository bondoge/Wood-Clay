import { and, eq } from "drizzle-orm";
import { db, type Database, type Transaction } from "@/db/client";
import { carts, cartItems, products } from "@/db/schema";
import { productSelectSchema } from "@/db/validators";
import { toProductView, type ProductView } from "@/app/(shop)/catalog/product-view";

/**
 * A logged-in user's cart, persisted in Postgres. A guest's cart lives in
 * the browser only (see CartContext) — there is no server-side row for a
 * guest cart, and nothing here is ever called on a guest's behalf.
 *
 * Every function takes userId and derives its own cart/cart-item scope from
 * it — never a client-suppliable cart or cart-item id — the same
 * elimination-by-construction approach lib/account.ts uses for addresses.
 *
 * Lines join live against `products` (current price/stock), not a
 * snapshot — snapshotting only happens once, at order creation.
 */

export type CartLine = { product: ProductView; quantity: number };
export type Cart = { lines: CartLine[]; itemCount: number; total: number };

function summarize(lines: CartLine[]): Cart {
  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    total: lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
  };
}

async function getCartId(userId: string): Promise<number | null> {
  const [row] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId));
  return row?.id ?? null;
}

async function getOrCreateCartId(userId: string): Promise<number> {
  const existing = await getCartId(userId);
  if (existing) return existing;
  const [created] = await db.insert(carts).values({ userId }).onConflictDoNothing().returning({ id: carts.id });
  // onConflictDoNothing returns nothing if a concurrent request created the
  // row first — re-select rather than treat that as failure.
  return created?.id ?? (await getCartId(userId))!;
}

export async function getCart(userId: string): Promise<Cart> {
  const cartId = await getCartId(userId);
  if (!cartId) return summarize([]);

  const rows = await db
    .select({ quantity: cartItems.quantity, product: products })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(and(eq(cartItems.cartId, cartId), eq(products.published, true)));

  const lines: CartLine[] = [];
  for (const row of rows) {
    const parsed = productSelectSchema.safeParse(row.product);
    if (parsed.success) lines.push({ product: toProductView(parsed.data), quantity: row.quantity });
  }
  return summarize(lines);
}

// Adds `delta` to whatever quantity is already in the cart for this product
// (0 if none yet), clamped to live stock. Shared by addToCart (delta = 1)
// and mergeGuestCart (delta = the guest's browser-cart quantity) so both
// paths get the same stock-aware clamping — neither can push a line past
// what's actually in stock.
async function addQuantity(userId: string, productId: number, delta: number): Promise<Cart> {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.published, true)));
  if (!product) return getCart(userId);

  const cartId = await getOrCreateCartId(userId);
  const [existing] = await db
    .select({ quantity: cartItems.quantity })
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)));
  const nextQuantity = Math.min((existing?.quantity ?? 0) + delta, product.stock);

  if (nextQuantity <= 0) return getCart(userId);

  await db
    .insert(cartItems)
    .values({ cartId, productId, quantity: nextQuantity })
    .onConflictDoUpdate({ target: [cartItems.cartId, cartItems.productId], set: { quantity: nextQuantity } });

  return getCart(userId);
}

export async function addToCart(userId: string, productId: number, quantity = 1): Promise<Cart> {
  return addQuantity(userId, productId, quantity);
}

export async function setItemQuantity(userId: string, productId: number, quantity: number): Promise<Cart> {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.published, true)));
  if (!product) return getCart(userId);

  const cartId = await getOrCreateCartId(userId);
  const clamped = Math.max(1, Math.min(quantity, product.stock));

  await db
    .insert(cartItems)
    .values({ cartId, productId, quantity: clamped })
    .onConflictDoUpdate({ target: [cartItems.cartId, cartItems.productId], set: { quantity: clamped } });

  return getCart(userId);
}

export async function removeItem(userId: string, productId: number): Promise<Cart> {
  const cartId = await getCartId(userId);
  if (cartId) {
    await db.delete(cartItems).where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)));
  }
  return getCart(userId);
}

// Called both by the "очистить корзину" button and, transactionally, by
// order creation on success — accepts an executor so it can join the same
// db.transaction() as the order insert in the latter case.
export async function clearCart(userId: string, executor: Database | Transaction = db): Promise<void> {
  const [row] = await executor.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId));
  if (!row) return;
  await executor.delete(cartItems).where(eq(cartItems.cartId, row.id));
}

export async function mergeGuestCart(
  userId: string,
  items: { productId: number; quantity: number }[],
): Promise<Cart> {
  let cart = summarize([]);
  for (const item of items) {
    cart = await addQuantity(userId, item.productId, item.quantity);
  }
  return cart;
}
