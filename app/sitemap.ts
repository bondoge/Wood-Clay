import type { MetadataRoute } from "next";
import { distinctSymbolYears, listPublishedInStock } from "@/lib/catalog";
import { CATEGORIES, INTERSECTIONS, MIN_SYMBOL_YEAR_PRODUCTS, STYLES, intersectionPath } from "@/lib/catalog-taxonomy";

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
  const [products, symbolYears] = await Promise.all([
    listPublishedInStock(),
    distinctSymbolYears(MIN_SYMBOL_YEAR_PRODUCTS),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/catalog`, changeFrequency: "daily", priority: 0.9 },
    // This season's highest-converting page (Task 2) — same priority band
    // as /catalog itself.
    { url: `${BASE_URL}/novogodnie-podarki-2027`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/korporativnye-podarki`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/o-nas`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/kontakty`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/oferta`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/rekvizity`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/vozvrat`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Generated from lib/catalog-taxonomy.ts's registry (not hand-listed), so
  // this never drifts from the actual set of live category/style/
  // intersection routes (Task 2 §2-4).
  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((c) => ({
    url: `${BASE_URL}/catalog/${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));
  const styleRoutes: MetadataRoute.Sitemap = STYLES.map((s) => ({
    url: `${BASE_URL}/catalog/${s.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  const intersectionRoutes: MetadataRoute.Sitemap = INTERSECTIONS.map((i) => ({
    url: `${BASE_URL}${intersectionPath(i.categoryId, i.styleId)}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  // Only years that actually cleared MIN_SYMBOL_YEAR_PRODUCTS get a route —
  // see app/(shop)/catalog/[slug]/page.tsx's resolver.
  const symbolYearRoutes: MetadataRoute.Sitemap = symbolYears.map((year) => ({
    url: `${BASE_URL}/catalog/simvol-goda-${year}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/catalog/${product.slug}`,
    changeFrequency: "weekly",
    // A mild, defensible bump for this season's curator-flagged picks —
    // nothing else distinguishes products at sitemap-priority granularity.
    priority: product.isTop30 ? 0.65 : 0.5,
  }));

  return [...staticRoutes, ...categoryRoutes, ...styleRoutes, ...intersectionRoutes, ...symbolYearRoutes, ...productRoutes];
}
