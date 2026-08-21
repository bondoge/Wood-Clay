import type { Metadata } from "next";
import { listPublished } from "@/lib/catalog";
import { CATEGORIES, INTERSECTIONS, STYLES, intersectionPath } from "@/lib/catalog-taxonomy";
import CatalogClient from "./CatalogClient";
import { PAGE_SIZE } from "./catalog-constants";
import { toProductView } from "./product-view";
import { ItemListJsonLd } from "@/components/seo/ItemListJsonLd";
import "./catalog.css";

const BASE_URL = "https://woodclay.ru";
const BASE_METADATA = {
  title: "Каталог фарфоровых изделий — Wood&Clay",
  description: "Фарфоровые ёлочные игрушки, интерьерные фигурки и изделия с ручной росписью Wood&Clay.",
};

// Product price/stock/published state changes outside a deploy (WB seed
// re-runs, Directus curation) — never serve a stale build-time snapshot of
// the catalogue.
export const dynamic = "force-dynamic";

type CatalogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Task 2's faceting policy: /catalog?style=X and ?category=X duplicate the
// real /catalog/{slug} routes (Task 2 §1-3), so they get a canonical
// pointing there instead of competing for the same query. Any other query
// param (sort, price range, pagination, ...), an unrecognized style/category
// value, or a style×category pair that isn't one of the built intersections
// (Task 2 §2 — would otherwise be a near-duplicate of the parent category
// page) gets noindex, optionally still canonicalized to the closest real
// parent. Plain /catalog with no query stays indexable as-is.
export async function generateMetadata({ searchParams }: CatalogPageProps): Promise<Metadata> {
  const { style, category, ...rest } = await searchParams;

  if (Object.keys(rest).length > 0) {
    return { ...BASE_METADATA, robots: { index: false, follow: true } };
  }

  const styleDef = typeof style === "string" ? STYLES.find((s) => s.id === style) : undefined;
  const categoryDef = typeof category === "string" ? CATEGORIES.find((c) => c.id === category) : undefined;

  if ((style && !styleDef) || (category && !categoryDef)) {
    return { ...BASE_METADATA, robots: { index: false, follow: true } };
  }

  if (styleDef && categoryDef) {
    const isBuilt = INTERSECTIONS.some((i) => i.categoryId === categoryDef.id && i.styleId === styleDef.id);
    return isBuilt
      ? { ...BASE_METADATA, alternates: { canonical: `${BASE_URL}${intersectionPath(categoryDef.id, styleDef.id)}` } }
      : {
          ...BASE_METADATA,
          robots: { index: false, follow: true },
          alternates: { canonical: `${BASE_URL}/catalog/${categoryDef.slug}` },
        };
  }
  if (styleDef) return { ...BASE_METADATA, alternates: { canonical: `${BASE_URL}/catalog/${styleDef.slug}` } };
  if (categoryDef) return { ...BASE_METADATA, alternates: { canonical: `${BASE_URL}/catalog/${categoryDef.slug}` } };

  return BASE_METADATA;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const [products, params] = await Promise.all([
    listPublished().then((rows) => rows.map(toProductView)),
    searchParams,
  ]);
  const style = typeof params.style === "string" ? params.style : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  return (
    <>
      {/* Scoped to the first PAGE_SIZE items — the default sort (no query,
          no filters) preserves array order (CatalogClient.tsx's scored.sort
          falls back to `a.index - b.index`), so this matches what's
          actually rendered on load, and avoids inlining a multi-hundred-KB
          JSON block for the whole catalogue. */}
      <ItemListJsonLd
        items={products.slice(0, PAGE_SIZE).map((p) => ({ name: p.title, slug: p.slug, image: p.images[0] }))}
      />
      <CatalogClient products={products} initialStyle={style} initialCategory={category} />
    </>
  );
}
