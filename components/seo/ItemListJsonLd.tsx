const BASE_URL = "https://woodclay.ru";

export type ItemListEntry = { name: string; slug: string; image?: string };

/**
 * Generic ItemList — takes the minimal shape any product listing already
 * has (title/slug/image), so it works for /catalog now and for task 2's
 * category/collection pages without changes.
 */
export function ItemListJsonLd({ items }: { items: ItemListEntry[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${BASE_URL}/catalog/${item.slug}`,
      name: item.name,
      ...(item.image && { image: item.image }),
    })),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
