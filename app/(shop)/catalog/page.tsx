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

export default async function CatalogPage() {
  const products = (await listPublished()).map(toProductView);
  return <CatalogClient products={products} />;
}
