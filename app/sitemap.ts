import type { MetadataRoute } from "next";
import { listPublished } from "@/lib/catalog";

// Same reasoning as app/page.tsx's `dynamic = "force-dynamic"`: this reads
// the DB, and the Docker build runs with placeholder DB creds, so a
// statically prerendered sitemap would fail at build time.
export const dynamic = "force-dynamic";

const BASE_URL = "https://woodclay.ru";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listPublished();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/catalog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/oferta`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/rekvizity`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/vozvrat`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/catalog/${product.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes];
}
