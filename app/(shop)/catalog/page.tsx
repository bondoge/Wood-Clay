import type { Metadata } from "next";
import { listPublished } from "@/lib/catalog";
import CatalogClient from "./CatalogClient";
import { PAGE_SIZE } from "./catalog-constants";
import { toProductView } from "./product-view";
import { ItemListJsonLd } from "@/components/seo/ItemListJsonLd";
import "./catalog.css";

export const metadata: Metadata = {
  title: "Каталог фарфоровых изделий — Wood&Clay",
  description: "Фарфоровые ёлочные игрушки, интерьерные фигурки и изделия с ручной росписью Wood&Clay.",
};

// Product price/stock/published state changes outside a deploy (WB seed
// re-runs, Directus curation) — never serve a stale build-time snapshot of
// the catalogue.
export const dynamic = "force-dynamic";

type CatalogPageProps = {
  searchParams: Promise<{ style?: string; category?: string }>;
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const [products, { style, category }] = await Promise.all([
    listPublished().then((rows) => rows.map(toProductView)),
    searchParams,
  ]);
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
