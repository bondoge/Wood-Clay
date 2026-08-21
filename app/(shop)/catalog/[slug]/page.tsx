import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bySlug, byCategory, bySymbolYear, byStyle, distinctSymbolYears, relatedTo } from "@/lib/catalog";
import {
  CATEGORIES,
  MIN_SYMBOL_YEAR_PRODUCTS,
  STYLES,
  categoryDefFor,
  categoryLabelFor,
  intersectionPath,
  intersectionsForCategory,
  intersectionsForStyle,
  resolveCatalogSlug,
} from "@/lib/catalog-taxonomy";
import { CATEGORY_COPY, STYLE_COPY } from "../category-copy";
import { SYMBOL_YEAR_COPY } from "../symbol-year-copy";
import { CategoryPageView } from "../CategoryPageView";
import { CatalogFooter, CatalogHeader, ProductCard } from "../catalog-components";
import { formatPrice, formatWeight } from "../catalog-utils";
import { toProductView } from "../product-view";
import ProductGallery from "../ProductGallery";
import AddToCartButton from "../AddToCartButton";
import CheckoutNowButton from "../CheckoutNowButton";
import ProductViewTracker from "../ProductViewTracker";
import { ProductJsonLd } from "@/components/seo/ProductJsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import "../catalog.css";

// Same reasoning as the catalog listing — price/stock/published state
// changes outside a deploy, never serve a stale snapshot.
export const dynamic = "force-dynamic";

type ProductPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  // /catalog/{slug} resolves in this order: category, then style, then
  // (Task 2 Phase 5) symbol-year, then a plain product lookup — see plan
  // §1 "URL structure" for why this lookup-precedence approach was chosen
  // over nesting products under a category segment.
  const resolved = resolveCatalogSlug(slug);
  if (resolved?.kind === "category") {
    const copy = CATEGORY_COPY[resolved.def.id];
    return { title: copy.title, description: copy.description };
  }
  if (resolved?.kind === "style") {
    const copy = STYLE_COPY[resolved.def.id];
    return { title: copy.title, description: copy.description };
  }
  if (resolved?.kind === "symbol-year") {
    const yearProducts = await bySymbolYear(resolved.year);
    if (yearProducts.length < MIN_SYMBOL_YEAR_PRODUCTS) return { title: "Страница не найдена — Wood&Clay" };
    const copy = SYMBOL_YEAR_COPY[resolved.year];
    if (copy) return { title: copy.title, description: copy.description };
  }

  const product = await bySlug(slug);
  if (!product) return { title: "Изделие не найдено — Wood&Clay" };
  const view = toProductView(product);
  return {
    title: `${view.title} — Wood&Clay`,
    description: view.description,
    openGraph: { images: view.images[0] ? [view.images[0]] : [] },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const resolved = resolveCatalogSlug(slug);

  if (resolved?.kind === "category") {
    const { def } = resolved;
    const copy = CATEGORY_COPY[def.id];
    const products = (await byCategory(def)).map(toProductView);
    const siblingCategories = CATEGORIES.filter((c) => c.id !== def.id)
      .map((c) => ({ href: `/catalog/${c.slug}`, label: c.label }));
    const intersections = intersectionsForCategory(def.id).map((i) => {
      const style = STYLES.find((s) => s.id === i.styleId)!;
      return { href: intersectionPath(def.id, i.styleId), label: `${def.label} · ${style.label}` };
    });
    return (
      <CategoryPageView
        eyebrow={copy.eyebrow}
        h1={copy.h1}
        intro={copy.intro}
        crumbs={[{ name: "Каталог", path: "/catalog" }, { name: def.label, path: `/catalog/${def.slug}` }]}
        products={products}
        initialCategory={def.id}
        relatedLinks={[...intersections, ...siblingCategories]}
      />
    );
  }

  if (resolved?.kind === "style") {
    const { def } = resolved;
    const copy = STYLE_COPY[def.id];
    const products = (await byStyle(def.id)).map(toProductView);
    const siblingStyles = STYLES.filter((s) => s.id !== def.id)
      .map((s) => ({ href: `/catalog/${s.slug}`, label: s.label }));
    const intersections = intersectionsForStyle(def.id).map((i) => {
      const category = CATEGORIES.find((c) => c.id === i.categoryId)!;
      return { href: intersectionPath(i.categoryId, def.id), label: `${category.label} · ${def.label}` };
    });
    return (
      <CategoryPageView
        eyebrow={copy.eyebrow}
        h1={copy.h1}
        intro={copy.intro}
        crumbs={[{ name: "Каталог", path: "/catalog" }, { name: def.label, path: `/catalog/${def.slug}` }]}
        products={products}
        initialStyle={def.id}
        relatedLinks={[...intersections, ...siblingStyles]}
      />
    );
  }

  if (resolved?.kind === "symbol-year") {
    const { year } = resolved;
    const copy = SYMBOL_YEAR_COPY[year];
    const yearProducts = (await bySymbolYear(year)).map(toProductView);
    if (!copy || yearProducts.length < MIN_SYMBOL_YEAR_PRODUCTS) notFound();
    const otherYears = (await distinctSymbolYears(MIN_SYMBOL_YEAR_PRODUCTS))
      .filter((y) => y !== year)
      .map((y) => ({ href: `/catalog/simvol-goda-${y}`, label: SYMBOL_YEAR_COPY[y].crumbLabel }));
    return (
      <CategoryPageView
        eyebrow={copy.eyebrow}
        h1={copy.h1}
        intro={copy.intro}
        crumbs={[{ name: "Каталог", path: "/catalog" }, { name: copy.crumbLabel, path: `/catalog/simvol-goda-${year}` }]}
        products={yearProducts}
        relatedLinks={otherYears}
      />
    );
  }

  const product = await bySlug(slug);
  if (!product) notFound();

  const view = toProductView(product);
  const categoryDef = categoryDefFor({ type: view.type, title: view.title });
  const categoryLabel = categoryLabelFor({ type: view.type, title: view.title });
  const categoryHref = categoryDef ? `/catalog/${categoryDef.slug}` : null;

  const related = (await relatedTo(product)).map(toProductView);

  return (
    <main className="catalog-page product-page">
      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Каталог", path: "/catalog" },
          { name: categoryLabel, path: categoryHref ?? `/catalog/${view.slug}` },
        ]}
      />
      <ProductViewTracker product={view} />
      <CatalogHeader />
      <div className="product-breadcrumbs">
        <Link href="/catalog">Каталог</Link><span>/</span>
        {categoryHref ? <Link href={categoryHref}>{categoryLabel}</Link> : <span>{categoryLabel}</span>}
      </div>

      <section className="product-detail">
        <ProductGallery images={view.images} title={view.title} />
        <aside className="product-detail__info">
          <p className="catalog-eyebrow">{view.styleLabel} · В наличии</p>
          <h1>{view.title}</h1>
          <p className="product-detail__price">{formatPrice(view.price)}</p>
          <AddToCartButton product={view} className="product-detail__add" />
          <CheckoutNowButton product={view} className="product-detail__contact product-detail__contact--secondary" />
          <p className="product-detail__reply">Вы сможете выбрать доставку СДЭК и оплатить заказ через ЮKassa.</p>

          <dl className="product-detail__facts">
            <div><dt>Материал</dt><dd>Фарфор</dd></div>
            <div><dt>Роспись</dt><dd>Ручная, {view.styleLabel.toLocaleLowerCase("ru-RU")}</dd></div>
            <div><dt>Категория</dt><dd>{categoryLabel}</dd></div>
            <div><dt>Артикул</dt><dd>{view.article}</dd></div>
            {view.lengthCm && view.widthCm && view.heightCm && (
              <div><dt>Размер</dt><dd>{view.lengthCm}×{view.widthCm}×{view.heightCm} см</dd></div>
            )}
            {view.weightG && (
              <div><dt>Вес</dt><dd>{formatWeight(view.weightG)}</dd></div>
            )}
          </dl>
        </aside>
      </section>

      <section className="product-story">
        <p className="catalog-eyebrow">Об изделии</p>
        <h2>Описание</h2>
        <p>{view.story}</p>
      </section>

      {related.length > 0 && (
        <section className="related-products">
          <div className="catalog-section-heading">
            <p className="catalog-eyebrow">Вам может понравиться</p>
            <h2>Продолжить знакомство</h2>
          </div>
          <div className="product-grid">
            {related.map((item) => <ProductCard product={item} key={item.id} />)}
          </div>
        </section>
      )}
      <CatalogFooter />
    </main>
  );
}
