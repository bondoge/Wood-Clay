import type { Style } from "@/db/validators";

// Single source of truth for category/style identity across the catalog —
// resolves the "filters say Ёлочные игрушки, product pages say Елочные
// украшения" drift (Task 2 finding): every place that shows a category name
// to a user reads CATEGORIES' `label` here, never the raw `product_type`
// column directly. Deliberately DB-free (no drizzle/db imports) so both
// server queries (lib/catalog.ts) and client-side filtering
// (CatalogClient.tsx via collections.ts) can import it without pulling `pg`
// into the client bundle.

export type MinimalProduct = { type: string; title: string };

export type CategoryDef = {
  id: string;
  slug: string;
  label: string;
  // Exact product_type match. Null for categories that aren't a real WB
  // product_type at all (Олимпийский мишка) — those use titleIncludesAll.
  productType: string | null;
  titleIncludesAll?: string[];
};

export const CATEGORIES: CategoryDef[] = [
  { id: "christmas", slug: "elochnye-igrushki", label: "Ёлочные игрушки", productType: "Елочные украшения" },
  { id: "figurines", slug: "figurki-i-statuetki", label: "Фигурки и статуэтки", productType: "Фигурки и статуэтки" },
  { id: "bells", slug: "kolokolchiki", label: "Колокольчики", productType: "Колокольчики" },
  { id: "jewelry", slug: "ukrasheniya", label: "Украшения", productType: "Заколки-автомат" },
  { id: "eggs", slug: "yaytsa-suvenirnye", label: "Яйца сувенирные", productType: "Яйца сувенирные" },
  { id: "matryoshka", slug: "matryoshki", label: "Матрёшки", productType: "Матрешки" },
  { id: "candlesticks", slug: "podsvechniki", label: "Подсвечники", productType: "Подсвечники" },
  { id: "olympic-bear", slug: "olimpiyskiy-mishka", label: "Олимпийский мишка", productType: null, titleIncludesAll: ["олимпийск", "мишк"] },
];

// A /catalog/simvol-goda-{year} page only exists once that year has this
// many published products — keeps out near-empty years (see lib/catalog.ts
// distinctSymbolYears, app/(shop)/catalog/[slug]/page.tsx's resolver).
export const MIN_SYMBOL_YEAR_PRODUCTS = 5;

export type StyleDef = { id: Style; slug: string; label: string };

export const STYLES: StyleDef[] = [
  { id: "gzhel", slug: "gzhel", label: "Гжель" },
  { id: "khokhloma", slug: "khokhloma", label: "Хохлома" },
  { id: "author", slug: "avtorskaya-rospis", label: "Авторская роспись" },
];

// Category×style pairs worth a dedicated landing page. Eligibility rule:
// >=20 published products AND that style is <90% of the category's total —
// it has to actually differ from the parent category page, not just
// reproduce it (a near-total-overlap page is exactly the thin/duplicate
// risk Yandex's Baden-Baden algorithm penalises). Computed once against the
// 2026-08-21 crosstab (see findings.md Task 2 §2: Ёлочные игрушки — author
// 146/gzhel 21/khokhloma 33; Фигурки и статуэтки — author 311/gzhel
// 128/khokhloma 46; every other category is single-style, so its only
// possible "intersection" would be ~100% identical to the category page and
// is correctly excluded). Hand-listed, not runtime-computed — each of these
// pages needs its own hand-written intro copy anyway, so the list is
// inherently a curated decision, not something that should appear/disappear
// as inventory fluctuates by a few units. Revisit if the catalog's
// category/style mix shifts substantially.
export const INTERSECTIONS: { categoryId: string; styleId: Style }[] = [
  { categoryId: "christmas", styleId: "gzhel" },
  { categoryId: "christmas", styleId: "khokhloma" },
  { categoryId: "christmas", styleId: "author" },
  { categoryId: "figurines", styleId: "gzhel" },
  { categoryId: "figurines", styleId: "khokhloma" },
  { categoryId: "figurines", styleId: "author" },
];

// Real dedicated-page URL for a homepage/catalog collection tile, if one
// exists — used so tiles link straight to the real page instead of
// /catalog?style=X (which only carries a canonical tag pointing there,
// invisible to a human clicking through). "year-symbol" is the one
// featured tile with no CATEGORIES entry (it's the symbol_year attribute,
// not a product_type/title predicate) — points at the current season's
// symbol-year page. Returns null for tiles with no dedicated page (the
// "remaining" type: raw-WB-category tiles with no registry entry).
export function tileHref(kind: "style" | "category", id: string): string | null {
  if (kind === "style") {
    const style = STYLES.find((s) => s.id === id);
    return style ? `/catalog/${style.slug}` : null;
  }
  if (id === "year-symbol") return "/catalog/simvol-goda-2027";
  const category = CATEGORIES.find((c) => c.id === id);
  return category ? `/catalog/${category.slug}` : null;
}

export function intersectionsForCategory(categoryId: string) {
  return INTERSECTIONS.filter((i) => i.categoryId === categoryId);
}

export function intersectionsForStyle(styleId: Style) {
  return INTERSECTIONS.filter((i) => i.styleId === styleId);
}

export function intersectionPath(categoryId: string, styleId: Style): string {
  const category = CATEGORIES.find((c) => c.id === categoryId)!;
  const style = STYLES.find((s) => s.id === styleId)!;
  return `/catalog/${category.slug}/${style.slug}`;
}

export function normalize(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

export function categoryMatchesProduct(product: MinimalProduct, categoryId: string): boolean {
  const def = CATEGORIES.find((c) => c.id === categoryId);
  if (!def) return false;
  if (def.titleIncludesAll) {
    const title = normalize(product.title);
    return def.titleIncludesAll.every((token) => title.includes(token));
  }
  return product.type === def.productType;
}

// The matching category definition for a product — checks title-based
// categories (currently just Олимпийский мишка) before productType-based
// ones, since a title match is more specific than a raw WB category that
// several distinct site categories share (olympic-bear products are filed
// under the same "Фигурки и статуэтки" product_type as ordinary figurines).
// Undefined for the handful of singleton WB categories with no registry
// entry (Соусники, Грелки для посуды, Зеркала косметические).
export function categoryDefFor(product: MinimalProduct): CategoryDef | undefined {
  const titleBased = CATEGORIES.find((c) => c.titleIncludesAll && categoryMatchesProduct(product, c.id));
  if (titleBased) return titleBased;
  return CATEGORIES.find((c) => c.productType === product.type);
}

// The canonical display label for a product's category — falls back to the
// raw product_type when there's no registry entry, rather than showing
// nothing.
export function categoryLabelFor(product: MinimalProduct): string {
  return categoryDefFor(product)?.label ?? product.type;
}

export type ResolvedCatalogSlug =
  | { kind: "category"; def: CategoryDef }
  | { kind: "style"; def: StyleDef }
  | { kind: "symbol-year"; year: number }
  | null;

// Resolution order for app/(shop)/catalog/[slug]/page.tsx: category, then
// style, then the simvol-goda-{year} pattern, then (by the caller) a plain
// product slug lookup. See plan §1 for why this lookup-precedence approach
// was chosen over nesting products under a category segment.
export function resolveCatalogSlug(slug: string): ResolvedCatalogSlug {
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (category) return { kind: "category", def: category };
  const style = STYLES.find((s) => s.slug === slug);
  if (style) return { kind: "style", def: style };
  const symbolMatch = /^simvol-goda-(\d{4})$/.exec(slug);
  if (symbolMatch) return { kind: "symbol-year", year: Number(symbolMatch[1]) };
  return null;
}

// For scripts/import-new-wb-products.mjs's slug generator: a future WB
// import must never silently produce a product slug that collides with one
// of these reserved single-segment identifiers (see plan §1's reserved-slug
// guard — today's collision risk is zero but structurally unguarded without
// this check).
export function isReservedCatalogSlug(slug: string): boolean {
  if (CATEGORIES.some((c) => c.slug === slug)) return true;
  if (STYLES.some((s) => s.slug === slug)) return true;
  if (/^simvol-goda-\d{4}$/.test(slug)) return true;
  return false;
}
