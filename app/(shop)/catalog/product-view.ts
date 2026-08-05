import type { Product, Style } from "@/db/validators";

// Flattened, display-ready shape — deliberately the same field set the
// design's original CatalogProduct mock used (id/article/slug/title/
// description/story/type/style/styleLabel/price/stock/images), so every
// ported component below reads it exactly as designed, with the
// own_*-over-source_* fallback resolved once, here, instead of scattered
// through every component.
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
    title: product.ownTitle ?? product.sourceTitle,
    description: product.sourceDescription,
    story: product.ownStory ?? product.sourceDescription,
    type: product.productType,
    style: product.style,
    styleLabel: STYLE_LABELS[product.style],
    price: product.priceRub,
    stock: product.stock,
    images: product.ownImages ?? product.sourceImages,
  };
}
