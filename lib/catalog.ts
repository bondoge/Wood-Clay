import { and, count, eq, gt, ilike, isNotNull, ne, or } from "drizzle-orm";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { productSelectSchema, type Product, type Style } from "@/db/validators";
import type { CategoryDef } from "@/lib/catalog-taxonomy";

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

// For the sitemap (app/sitemap.ts) — an out-of-stock product still shows on
// the site (with an "in stock" claim that's arguably wrong, see findings.md)
// but shouldn't be offered to a crawler as a URL worth indexing.
export async function listPublishedInStock(): Promise<Product[]> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.published, true), gt(products.stock, 0)));
  return parseRowsLenient(rows);
}

export async function byStyle(style: Style): Promise<Product[]> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.published, true), eq(products.style, style)));
  return parseRowsLenient(rows);
}

// A category is either an exact product_type match, or (for Олимпийский
// мишка, not a real WB category) an all-tokens-present title match — see
// lib/catalog-taxonomy.ts's CategoryDef.
function categoryWhereClause(def: CategoryDef) {
  if (def.titleIncludesAll) {
    return and(...def.titleIncludesAll.map((token) => ilike(products.ownTitle, `%${token}%`)));
  }
  return eq(products.productType, def.productType!);
}

export async function byCategory(def: CategoryDef): Promise<Product[]> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.published, true), categoryWhereClause(def)));
  return parseRowsLenient(rows);
}

export async function byStyleAndCategory(style: Style, def: CategoryDef): Promise<Product[]> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.published, true), eq(products.style, style), categoryWhereClause(def)));
  return parseRowsLenient(rows);
}

export async function bySymbolYear(year: number): Promise<Product[]> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.published, true), eq(products.symbolYear, year)));
  return parseRowsLenient(rows);
}

// Every distinct symbol_year with at least `minCount` published products —
// this is what makes /catalog/simvol-goda-{year} pages regenerate on their
// own each year (see lib/catalog-taxonomy.ts's MIN_SYMBOL_YEAR_PRODUCTS):
// a year only gets a page once real stock clears the threshold, with no
// code change needed as new years get backfilled or old stock sells out.
export async function distinctSymbolYears(minCount: number): Promise<number[]> {
  const rows = await db
    .select({ year: products.symbolYear, count: count() })
    .from(products)
    .where(and(eq(products.published, true), isNotNull(products.symbolYear)))
    .groupBy(products.symbolYear);
  return rows
    .filter((row) => row.count >= minCount)
    .map((row) => row.year as number)
    .sort((a, b) => a - b);
}

// "Новогодние подарки 2027" — the curator's is_top30 flag, used exactly as
// flagged (no additional New-Year-relevance filtering — resolved with the
// user, see plan for Task 2).
export async function listTop30(): Promise<Product[]> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.published, true), eq(products.isTop30, true)));
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
