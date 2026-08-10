import type { Product, Style } from "@/db/validators";

// Flattened, display-ready shape — deliberately the same field set the
// design's original CatalogProduct mock used (id/article/slug/title/
// description/story/type/style/styleLabel/price/stock/images), so every
// ported component below reads it exactly as designed. The site reads only
// own_* (never wb_*) — own_* is always populated, see db/schema.ts.
export type ProductView = {
  id: number;
  article: string;
  slug: string;
  title: string;
  description: string;
  story: string;
  type: string;
  style: Style;
  styleLabel: string;
  price: number;
  stock: number;
  images: string[];
};

const STYLE_LABELS: Record<Style, string> = {
  gzhel: "Гжель",
  khokhloma: "Хохлома",
  author: "Авторская роспись",
};

export function toProductView(product: Product): ProductView {
  return {
    id: product.id,
    article: product.wbArticle,
    slug: product.slug,
    title: product.ownTitle,
    // description and story both read the same own_description — the
    // schema only has one editable copy of this text (see db/schema.ts's
    // 2026-08-10 wb/own rename). They render in two different spots on the
    // product page (a short lead, then a full section further down), so
    // they'll show identical text until that page's copy/layout is revisited.
    description: product.ownDescription,
    story: product.ownDescription,
    type: product.productType,
    style: product.style,
    styleLabel: STYLE_LABELS[product.style],
    price: product.priceRub,
    stock: product.stock,
    images: product.ownImages,
  };
}
