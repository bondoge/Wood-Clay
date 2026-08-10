import type { ProductView } from "./product-view";

export const STYLE_ORDER = ["gzhel", "khokhloma", "author"];
export const STYLE_LABELS: Record<string, string> = {
  gzhel: "Гжель",
  khokhloma: "Хохлома",
  author: "Авторская роспись",
};
export const FEATURED_CATEGORY_IDS = ["olympic-bear", "jewelry", "christmas", "figurines", "year-symbol"];
export const FEATURED_CATEGORY_LABELS: Record<string, string> = {
  "olympic-bear": "Олимпийский мишка",
  jewelry: "Украшения",
  christmas: "Ёлочные игрушки",
  figurines: "Фигурки и статуэтки",
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

export function normalize(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim();
}

export function matchesCategory(product: ProductView, categoryId: string) {
  const title = normalize(product.title);
  if (categoryId === "olympic-bear") return title.includes("олимпийск") && title.includes("мишк");
  if (categoryId === "jewelry") return product.type === "Заколки-автомат";
  if (categoryId === "christmas") return product.type === "Елочные украшения";
  if (categoryId === "figurines") return product.type === "Фигурки и статуэтки";
  if (categoryId === "year-symbol") return title.includes("коза");
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
    .map(([type, count]) => ({ id: `type:${type}`, label: type, count }));
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
