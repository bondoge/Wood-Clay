import { and, eq, gte, sql } from "drizzle-orm";
import { db, type Database, type Transaction } from "@/db/client";
import { products } from "@/db/schema";

/**
 * Called from lib/orders.ts's createOrder, inside a db.transaction() — pass
 * that transaction's `tx` as `executor` so the decrement commits or rolls
 * back atomically with the order row, not as a separate implicit
 * transaction against the pool. Defaults to the top-level `db` for callers
 * (and tests) that don't need transactional grouping.
 *
 * The WHERE clause's stock >= quantity check and the SET's arithmetic run as
 * one atomic UPDATE, so two concurrent calls against the same row can't both
 * succeed past zero — Postgres serializes the second update against the
 * first's result rather than both reading a stale stock value.
 */
export async function decrementStock(
  productId: number,
  quantity: number,
  executor: Database | Transaction = db,
): Promise<boolean> {
  const result = await executor
    .update(products)
    .set({ stock: sql`${products.stock} - ${quantity}` })
    .where(and(eq(products.id, productId), gte(products.stock, quantity)))
    .returning({ id: products.id });
  return result.length > 0;
}

/**
 * The reverse of decrementStock — returns stock a cancelled/failed order had
 * held. Unconditional (a return can't fail a "do we have enough" check the
 * way a decrement can), but still routed through an executor so it can join
 * the same transaction as the order's status update in lib/orders.ts's
 * cancelOrder.
 */
export async function incrementStock(
  productId: number,
  quantity: number,
  executor: Database | Transaction = db,
): Promise<void> {
  await executor
    .update(products)
    .set({ stock: sql`${products.stock} + ${quantity}` })
    .where(eq(products.id, productId));
}
