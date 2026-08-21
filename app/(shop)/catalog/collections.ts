import type { ProductView } from "./product-view";
import { CATEGORIES, STYLES, categoryMatchesProduct } from "@/lib/catalog-taxonomy";

// Re-exported so CatalogClient.tsx's existing `import { normalize } from
// "./collections"` keeps working — lib/catalog-taxonomy.ts is now the
// actual implementation (shared with the server-side category/style pages).
export { normalize } from "@/lib/catalog-taxonomy";

export const STYLE_ORDER = STYLES.map((s) => s.id);
export const STYLE_LABELS: Record<string, string> = Object.fromEntries(STYLES.map((s) => [s.id, s.label]));

export const FEATURED_CATEGORY_IDS = ["olympic-bear", "jewelry", "christmas", "figurines", "year-symbol"];
export const FEATURED_CATEGORY_LABELS: Record<string, string> = {
  "olympic-bear": CATEGORIES.find((c) => c.id === "olympic-bear")!.label,
  jewelry: CATEGORIES.find((c) => c.id === "jewelry")!.label,
  christmas: CATEGORIES.find((c) => c.id === "christmas")!.label,
  figurines: CATEGORIES.find((c) => c.id === "figurines")!.label,
  "year-symbol": "Символ года",
};
const STYLE_IMAGE_ARTICLES: Record<string, string> = {
  gzhel: "403704180",
  author: "497278688",
};
const CATEGORY_IMAGE_ARTICLES: Record<string, string> = {
  "olympic-bear": "992127613",
  christmas: "225626203",
  figurines: "134756413",
  "year-symbol": "1252955726",
};
const JEWELRY_COLLECTION_IMAGE = "https://1bdb1afd-641e-4c4c-be89-1010e798b2e5.selstorage.ru/products/1/155402178/0-medium.avif";

export function matchesCategory(product: ProductView, categoryId: string) {
  if (categoryId === "year-symbol") {
    // TODO(Task 2 Phase 5): switch to `product.symbolYear === {current
    // zodiac year}` once the symbol_year attribute exists — see
    // findings.md. Hardcoding "коза" breaks every year the site doesn't
    // update this string, which is exactly the bug this attribute fixes.
    const title = product.title.toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
    return title.includes("коза");
  }
  if (CATEGORIES.some((c) => c.id === categoryId)) {
    return categoryMatchesProduct({ type: product.type, title: product.title }, categoryId);
  }
  return categoryId.startsWith("type:") && product.type === categoryId.slice(5);
}

export type StyleTile = { style: string; label: string; image: string; count: number };
export type CategoryTile = { id: string; label: string; count: number };
export type CollectionTile = { id: string; kind: "style" | "category"; label: string; image: string; count: number };

export function computeStyles(products: ProductView[]): StyleTile[] {
  return STYLE_ORDER.map((style) => {
    const fallbackProduct = products.find((item) => item.style === style);
    const imageProduct = products.find((item) => item.article === STYLE_IMAGE_ARTICLES[style]);
    return fallbackProduct ? {
      style,
      label: STYLE_LABELS[style],
      image: imageProduct?.images[0] ?? fallbackProduct.images[0],
      count: products.filter((item) => item.style === style).length,
    } : null;
  }).filter(Boolean) as StyleTile[];
}

export function computeCategories(products: ProductView[]): CategoryTile[] {
  const counts = new Map<string, number>();
  products.forEach((product) => counts.set(product.type, (counts.get(product.type) ?? 0) + 1));
  const featured = FEATURED_CATEGORY_IDS.map((id) => ({
    id,
    label: FEATURED_CATEGORY_LABELS[id],
    count: products.filter((product) => matchesCategory(product, id)).length,
  }));
  const coveredTypes = new Set(["Заколки-автомат", "Елочные украшения", "Фигурки и статуэтки"]);
  const remaining = Array.from(counts.entries())
    .filter(([type]) => !coveredTypes.has(type))
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => {
      // Route any raw product_type that has a taxonomy entry (Колокольчики,
      // Яйца сувенирные, Матрешки, Подсвечники) through the same canonical
      // id/label the new /catalog/{slug} routes use, so the sidebar filter
      // and the real category page agree on both id and display label.
      const registryMatch = CATEGORIES.find((c) => c.productType === type);
      return registryMatch
        ? { id: registryMatch.id, label: registryMatch.label, count }
        : { id: `type:${type}`, label: type, count };
    });
  return [...featured, ...remaining];
}

export function computeCollectionTiles(styles: StyleTile[], categories: CategoryTile[], products: ProductView[]): CollectionTile[] {
  return [
    ...styles.map((style) => ({ ...style, id: style.style, kind: "style" as const })),
    ...FEATURED_CATEGORY_IDS.map((categoryId) => {
      const category = categories.find((item) => item.id === categoryId)!;
      const imageProduct = products.find((item) => item.article === CATEGORY_IMAGE_ARTICLES[categoryId]);
      return {
        id: categoryId,
        kind: "category" as const,
        label: category.label,
        count: category.count,
        image: categoryId === "jewelry" ? JEWELRY_COLLECTION_IMAGE : imageProduct?.images[0] ?? products[0].images[0],
      };
    }),
  ];
}
