import { and, count, eq, ne, or } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { productSelectSchema, type Product, type Style } from "@/db/validators";

/**
 * Every query here filters `published = true` in SQL — there is no
 * exported function in this module that can return an unpublished row.
 *
 * Listing functions (`listPublished`, `byStyle`, `flagships`) use safeParse:
 * a malformed row is warned and skipped, the rest of the list still comes
 * back. This is externally-sourced data reviewed asynchronously by a human,
 * so a bad row is expected, not hypothetical — a listing page must never
 * 500 because one product has a bad field. `bySlug` is a single intentional
 * lookup and throws instead, per the "fail loudly" requirement.
 */
function parseRowsLenient(rows: unknown[]): Product[] {
  const parsed: Product[] = [];
  for (const row of rows) {
    const result = productSelectSchema.safeParse(row);
    if (result.success) {
      parsed.push(result.data);
    } else {
      const id = (row as { id?: unknown }).id;
      console.warn(`lib/catalog: skipping invalid product row (id=${id}):`, result.error.message);
    }
  }
  return parsed;
}

export async function listPublished(): Promise<Product[]> {
  const rows = await db.select().from(products).where(eq(products.published, true));
  return parseRowsLenient(rows);
}

export async function byStyle(style: Style): Promise<Product[]> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.published, true), eq(products.style, style)));
  return parseRowsLenient(rows);
}

// Same style OR same raw category — broader than a strict style match, so a
// gzhel figurine still surfaces khokhloma/author pieces of the same kind.
export async function relatedTo(product: Product, limit = 3): Promise<Product[]> {
  const rows = await db
    .select()
    .from(products)
    .where(and(
      eq(products.published, true),
      ne(products.id, product.id),
      or(eq(products.style, product.style), eq(products.productType, product.productType)),
    ))
    .limit(limit);
  return parseRowsLenient(rows);
}

export async function countPublished(): Promise<number> {
  const rows = await db.select({ count: count() }).from(products).where(eq(products.published, true));
  return rows[0]?.count ?? 0;
}

export async function bySlug(slug: string): Promise<Product | null> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.published, true), eq(products.slug, slug)))
    .limit(1);
  const row = rows[0];
  return row ? productSelectSchema.parse(row) : null;
}
