import { Fragment } from "react";
import Link from "next/link";
import { BreadcrumbJsonLd, type Crumb } from "@/components/seo/BreadcrumbJsonLd";
import { ItemListJsonLd } from "@/components/seo/ItemListJsonLd";
import CatalogClient from "./CatalogClient";
import { PAGE_SIZE } from "./catalog-constants";
import type { ProductView } from "./product-view";

type RelatedLink = { href: string; label: string };

type CategoryPageViewProps = {
  eyebrow: string;
  h1: string;
  intro: string;
  crumbs: Crumb[];
  products: ProductView[];
  initialStyle?: string;
  initialCategory?: string;
  relatedLinks: RelatedLink[];
};

// Shared renderer for every Task 2 landing page (category, style,
// category×style intersection, symbol-year) — each `page.tsx` only supplies
// its own copy (eyebrow/h1/intro), breadcrumb trail, and pre-filtered
// product list; the search/filter/sort/pagination UI is CatalogClient
// itself, reused wholesale rather than rebuilt per page.
export function CategoryPageView({
  eyebrow, h1, intro, crumbs, products, initialStyle, initialCategory, relatedLinks,
}: CategoryPageViewProps) {
  return (
    <>
      <BreadcrumbJsonLd crumbs={crumbs} />
      {/* Scoped to the first PAGE_SIZE items — same reasoning as /catalog's
          own ItemListJsonLd (see findings.md): matches what's server-rendered
          before any client interaction, avoids a multi-hundred-KB JSON block
          for the largest categories. */}
      <ItemListJsonLd
        items={products.slice(0, PAGE_SIZE).map((p) => ({ name: p.title, slug: p.slug, image: p.images[0] }))}
      />
      <CatalogClient
        products={products}
        initialStyle={initialStyle}
        initialCategory={initialCategory}
        hideCollectionsBlock
        heroOverride={
          <Fragment key="hero">
            <div className="product-breadcrumbs">
              {crumbs.map((crumb, index) => (
                <Fragment key={crumb.path}>
                  {index > 0 && <span>/</span>}
                  {index === crumbs.length - 1 ? (
                    <span>{crumb.name}</span>
                  ) : (
                    <Link href={crumb.path}>{crumb.name}</Link>
                  )}
                </Fragment>
              ))}
            </div>
            <section className="catalog-hero">
              <div className="catalog-hero__wash" aria-hidden="true" />
              <p className="catalog-eyebrow">{eyebrow}</p>
              <h1>{h1}</h1>
            </section>
          </Fragment>
        }
        relatedLinksSlot={
          <Fragment key="outro-and-links">
            {/* The full intro copy moved below the grid, not above it — the
                text is written for search engines and for someone who wants
                more context, not as the first thing a shopper has to scroll
                past to see products. Same words, better position. */}
            <section className="product-story">
              <p className="catalog-eyebrow">О коллекции</p>
              <h2>{h1}</h2>
              <p>{intro}</p>
            </section>
            {relatedLinks.length > 0 && (
              <section className="catalog-related-links">
                <div className="catalog-section-heading">
                  <h2>Смотрите также</h2>
                </div>
                <nav aria-label="Смотрите также">
                  {relatedLinks.map((link) => (
                    <Link href={link.href} key={link.href}>{link.label}</Link>
                  ))}
                </nav>
              </section>
            )}
          </Fragment>
        }
      />
    </>
  );
}
