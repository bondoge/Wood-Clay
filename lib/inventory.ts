import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";

/**
 * Not yet called from anywhere — the checkout flow that will call this
 * doesn't exist yet. This is the write path lib/catalog.ts deliberately
 * doesn't have (it's documented as read-only).
 *
 * The WHERE clause's stock >= quantity check and the SET's arithmetic run as
 * one atomic UPDATE, so two concurrent calls against the same row can't both
 * succeed past zero — Postgres serializes the second update against the
 * first's result rather than both reading a stale stock value.
 */
export async function decrementStock(productId: number, quantity: number): Promise<boolean> {
  const result = await db
    .update(products)
    .set({ stock: sql`${products.stock} - ${quantity}` })
    .where(and(eq(products.id, productId), gte(products.stock, quantity)))
    .returning({ id: products.id });
  return result.length > 0;
}
