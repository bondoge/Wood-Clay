import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bySlug, relatedTo } from "@/lib/catalog";
import { CatalogFooter, CatalogHeader, ProductCard } from "../catalog-components";
import { formatPrice, formatWeight } from "../catalog-utils";
import { toProductView } from "../product-view";
import ProductGallery from "../ProductGallery";
import AddToCartButton from "../AddToCartButton";
import CheckoutNowButton from "../CheckoutNowButton";
import ProductViewTracker from "../ProductViewTracker";
import "../catalog.css";

// Same reasoning as the catalog listing — price/stock/published state
// changes outside a deploy, never serve a stale snapshot.
export const dynamic = "force-dynamic";

type ProductPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
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
  const product = await bySlug(slug);
  if (!product) notFound();

  const view = toProductView(product);

  const related = (await relatedTo(product)).map(toProductView);

  return (
    <main className="catalog-page product-page">
      <ProductViewTracker product={view} />
      <CatalogHeader />
      <div className="product-breadcrumbs">
        <Link href="/catalog">Каталог</Link><span>/</span><span>{view.type}</span>
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
            <div><dt>Категория</dt><dd>{view.type}</dd></div>
            <div><dt>Артикул</dt><dd>{view.article}</dd></div>
            <div><dt>Остаток</dt><dd>{view.stock} шт.</dd></div>
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
