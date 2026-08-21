import type { MetadataRoute } from "next";

// No DB dependency (unlike sitemap.ts), so no force-dynamic needed — this is
// static and can be built/cached like any other route.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account",
        "/account/",
        "/catalog/cart",
        "/api/",
        // Token-based private order lookup (app/order/status) — nothing to
        // index, and the token in a crawled/cached URL would leak it.
        "/order/status",
      ],
    },
    sitemap: "https://woodclay.ru/sitemap.xml",
  };
}
