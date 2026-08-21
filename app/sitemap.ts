import type { MetadataRoute } from "next";
import { listPublishedInStock } from "@/lib/catalog";

// Reads the DB (in-stock published products) — the Docker build runs with
// placeholder DB creds, so a statically prerendered sitemap would fail at
// build time, same reasoning as app/(shop)/catalog/page.tsx.
export const dynamic = "force-dynamic";

const BASE_URL = "https://woodclay.ru";

// lastModified is deliberately omitted everywhere below, not faked. There is
// no `updated_at` column on `products` — `imported_at` exists but only
// reflects when a row was last synced from Wildberries, not later Directus
// edits (price/style/publish changes don't touch it), so it would misstate
// freshness for anything curated after import. Static pages have no
// per-page timestamp at all. See findings.md for the recommendation to add
// a real auto-maintained `updated_at` column.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listPublishedInStock();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/catalog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/korporativnye-podarki`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/o-nas`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/kontakty`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/oferta`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/rekvizity`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/vozvrat`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/catalog/${product.slug}`,
    changeFrequency: "weekly",
    // A mild, defensible bump for this season's curator-flagged picks —
    // nothing else distinguishes products at sitemap-priority granularity.
    priority: product.isTop30 ? 0.65 : 0.5,
  }));

  return [...staticRoutes, ...productRoutes];
}
