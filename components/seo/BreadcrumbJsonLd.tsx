const BASE_URL = "https://woodclay.ru";

export type Crumb = { name: string; path: string };

/**
 * Generic BreadcrumbList — pass exactly the crumbs visibly rendered on the
 * page, in order, nothing more. Never invent a level (e.g. a "Главная"
 * crumb) that isn't actually shown in the UI it's paired with.
 */
export function BreadcrumbJsonLd({ crumbs }: { crumbs: Crumb[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${BASE_URL}${crumb.path}`,
    })),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
