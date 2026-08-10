import type { Metadata } from "next";
import { listPublished } from "@/lib/catalog";
import CatalogClient from "./CatalogClient";
import { toProductView } from "./product-view";
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
  return <CatalogClient products={products} initialStyle={style} initialCategory={category} />;
}
