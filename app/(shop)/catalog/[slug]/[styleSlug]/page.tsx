import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { byStyleAndCategory } from "@/lib/catalog";
import {
  CATEGORIES,
  STYLES,
  INTERSECTIONS,
  intersectionsForCategory,
} from "@/lib/catalog-taxonomy";
import { INTERSECTION_COPY } from "../../intersection-copy";
import { CategoryPageView } from "../../CategoryPageView";
import { toProductView } from "../../product-view";
import "../../catalog.css";

export const dynamic = "force-dynamic";

type IntersectionPageProps = { params: Promise<{ slug: string; styleSlug: string }> };

// A category×style pair is only real if it's in the curated INTERSECTIONS
// list (lib/catalog-taxonomy.ts) — every other combination (e.g. bells×gzhel,
// which would be ~100% identical to the plain bells category page) 404s
// rather than rendering a thin duplicate page. This is a nested route under
// the same [slug] segment as the category/style/product resolver
// (app/(shop)/catalog/[slug]/page.tsx) — Next.js requires a shared dynamic
// segment name at the same directory depth, and /catalog/{x}/{y} had no
// prior meaning, so this is purely additive, not ambiguous with anything.
function resolveIntersection(categorySlug: string, styleSlug: string) {
  const category = CATEGORIES.find((c) => c.slug === categorySlug);
  const style = STYLES.find((s) => s.slug === styleSlug);
  if (!category || !style) return null;
  const isBuilt = INTERSECTIONS.some((i) => i.categoryId === category.id && i.styleId === style.id);
  return isBuilt ? { category, style } : null;
}

export async function generateMetadata({ params }: IntersectionPageProps): Promise<Metadata> {
  const { slug, styleSlug } = await params;
  const resolved = resolveIntersection(slug, styleSlug);
  if (!resolved) return { title: "Страница не найдена — Wood&Clay" };
  const copy = INTERSECTION_COPY[`${resolved.category.id}:${resolved.style.id}`];
  return { title: copy.title, description: copy.description };
}

export default async function IntersectionPage({ params }: IntersectionPageProps) {
  const { slug, styleSlug } = await params;
  const resolved = resolveIntersection(slug, styleSlug);
  if (!resolved) notFound();

  const { category, style } = resolved;
  const copy = INTERSECTION_COPY[`${category.id}:${style.id}`];
  const products = (await byStyleAndCategory(style.id, category)).map(toProductView);

  const siblingIntersections = intersectionsForCategory(category.id)
    .filter((i) => i.styleId !== style.id)
    .map((i) => {
      const siblingStyle = STYLES.find((s) => s.id === i.styleId)!;
      return { href: `/catalog/${category.slug}/${siblingStyle.slug}`, label: `${category.label} · ${siblingStyle.label}` };
    });

  return (
    <CategoryPageView
      eyebrow={copy.eyebrow}
      h1={copy.h1}
      intro={copy.intro}
      crumbs={[
        { name: "Каталог", path: "/catalog" },
        { name: category.label, path: `/catalog/${category.slug}` },
        { name: style.label, path: `/catalog/${category.slug}/${style.slug}` },
      ]}
      products={products}
      initialCategory={category.id}
      initialStyle={style.id}
      relatedLinks={[
        { href: `/catalog/${category.slug}`, label: `Все ${category.label.toLocaleLowerCase("ru-RU")}` },
        { href: `/catalog/${style.slug}`, label: `${style.label} — все изделия` },
        ...siblingIntersections,
      ]}
    />
  );
}
