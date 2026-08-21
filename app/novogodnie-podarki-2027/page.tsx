import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { listTop30 } from "@/lib/catalog";
import { toProductView } from "../(shop)/catalog/product-view";
import { CartProvider } from "../(shop)/catalog/CartContext";
import CatalogClient from "../(shop)/catalog/CatalogClient";
import { HeaderAccountActions, MobileAccountLink, MobileNavToggle } from "../(shop)/catalog/catalog-components";
import { NAV_LINKS } from "../(shop)/catalog/catalog-nav-links";
import { PAGE_SIZE } from "../(shop)/catalog/catalog-constants";
import { CatalogPdfDownload } from "@/components/catalog/CatalogPdfDownload";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { ItemListJsonLd } from "@/components/seo/ItemListJsonLd";
import "../(shop)/catalog/catalog.css";

export const metadata: Metadata = {
  title: "Новогодние подарки 2027 — фарфор ручной работы — Wood&Clay",
  description:
    "Фарфоровые новогодние подарки 2027 года, расписанные вручную мастерами в России: символ года, ёлочные игрушки, статуэтки и небольшие подарки для родных и друзей.",
};

// Same reasoning as /catalog — is_top30/price/stock changes outside a
// deploy, never serve a stale build-time snapshot.
export const dynamic = "force-dynamic";

const CRUMBS = [{ name: "Новогодние подарки 2027", path: "/novogodnie-podarki-2027" }];

export default async function NovogodniePodarkiPage() {
  // Not under the (shop) route group (this is a standalone landing page,
  // not a catalog/[slug] resolver route — see the plan for why), so it
  // doesn't inherit (shop)/layout.tsx's SessionProvider or
  // catalog/layout.tsx's CartProvider automatically. Reads its own session
  // and wraps both, exactly like app/page.tsx (the home page) already does
  // for the same reason.
  const [session, products] = await Promise.all([
    auth(),
    listTop30().then((rows) => rows.map(toProductView)),
  ]);

  return (
    <SessionProvider session={session}>
      <CartProvider>
        {/* Same LCP reasoning as app/page.tsx's identical preload: this
            page's hero uses the same video+poster, so the poster (not the
            video) needs to start fetching immediately. */}
        <link rel="preload" as="image" href="/hero-poster.jpg" fetchPriority="high" />
        <BreadcrumbJsonLd crumbs={CRUMBS} />
        <ItemListJsonLd
          items={products.slice(0, PAGE_SIZE).map((p) => ({ name: p.title, slug: p.slug, image: p.images[0] }))}
        />
        <CatalogClient
          products={products}
          hideCollectionsBlock
          hideHeader
          heroOverride={
            <Fragment key="hero">
              {/* Reuses the home page's own .hero/.hero__video/.hero__shade/
                  .hero__content/.site-header classes verbatim (app/globals.css),
                  not a parallel .catalog-hero--video variant — an earlier
                  from-scratch variant dimmed visibly during mobile scroll
                  while the home page's hero never did, and rebuilding it as
                  literally the same CSS is the reliable way to guarantee
                  identical behaviour rather than keep guessing at the
                  difference. The nav lives inside the hero (transparent,
                  overlaid on the video) instead of CatalogClient's usual
                  opaque CatalogHeader bar above it — see hideHeader — so the
                  video starts at the very top of the page, same as home. */}
              <section className="hero">
                <video
                  className="hero__video"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/hero-poster.jpg"
                  aria-hidden="true"
                >
                  <source
                    src="https://1bdb1afd-641e-4c4c-be89-1010e798b2e5.selstorage.ru/hero_video/hero_video_3-optimized.mp4"
                    type="video/mp4"
                  />
                </video>
                <div className="hero__shade" aria-hidden="true" />

                <header className="site-header">
                  <Link className="brand" href="/" aria-label="Wood&Clay — на главную">
                    <img className="brand__mark" src="/woodclay-mark.png" alt="" width="76" height="58" />
                    <img className="brand__wordmark" src="/woodclay-wordmark.svg" alt="Wood&Clay" width="100" height="19" />
                  </Link>

                  <nav className="site-header__nav" aria-label="Основная навигация">
                    <Link href="/">Главная</Link>
                    {NAV_LINKS.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
                  </nav>

                  <nav className="site-header__actions" aria-label="Каталог, кабинет и корзина">
                    <HeaderAccountActions />
                    <MobileNavToggle>
                      <Link href="/">Главная</Link>
                      {NAV_LINKS.map((link) => <Link href={link.href} key={link.href}>{link.label}</Link>)}
                      <MobileAccountLink />
                    </MobileNavToggle>
                  </nav>
                </header>

                <div className="hero__content">
                  <p className="hero__kicker">Коллекция подарков к Новому году · Ручная роспись</p>
                  <h1>Новогодние подарки 2027</h1>
                </div>

                {/* Same scroll cue as the home page's hero (.hero__scroll,
                    app/globals.css) — points at the product grid below
                    instead of the home page's #about section. The home
                    page hides this below 680px (its own hero fills the
                    full screen there, so scrolling is the obvious next
                    move); this page still needs the prompt on mobile, so
                    the extra --gift modifier class overrides that one
                    rule back to visible — see catalog.css. */}
                <a className="hero__scroll hero__scroll--gift" href="#catalog-products" aria-label="Перейти к подборке изделий">
                  <span>Смотреть подборку</span>
                  <span className="hero__scroll-line" aria-hidden="true" />
                </a>
              </section>

              <div className="product-breadcrumbs">
                {CRUMBS.map((crumb, index) => (
                  <Fragment key={crumb.path}>
                    {index > 0 && <span>/</span>}
                    <span>{crumb.name}</span>
                  </Fragment>
                ))}
              </div>
            </Fragment>
          }
          relatedLinksSlot={
            <Fragment key="outro-pdf-and-links">
              {/* Same words as before, moved below the grid — a shopper sees
                  products first; the text is still on the page for search
                  engines and for anyone who wants the fuller story. */}
              <section className="product-story">
                <p className="catalog-eyebrow">О коллекции</p>
                <h2>Новогодние подарки 2027</h2>
                <p>
                  Каждую зиму мы собираем подборку изделий, которые особенно хочется
                  подарить к Новому году: фигурки символа года, ёлочные игрушки,
                  колокольчики и небольшие тёплые подарки — для семьи, друзей и тех,
                  кому сложно выбрать что-то особенное. Каждое изделие отливается из
                  фарфора и расписывается вручную художниками наших мастерских в
                  России — кистью, слой за слоем, с закреплением цвета обжигом.
                  Именно поэтому двух одинаковых вещей не бывает: лёгкая неровность
                  мазка — это след настоящей руки, а не тиражная печать. Такой подарок
                  не затеряется среди привычных сувениров: год за годом его будут
                  доставать с антресоли вместе с другими любимыми украшениями, и со
                  временем он станет частью собственной новогодней истории.
                </p>
              </section>
              <CatalogPdfDownload />
              <section className="catalog-related-links">
                <nav aria-label="Смотрите также">
                  <Link href="/catalog/simvol-goda-2027">Символ года 2027 — Коза</Link>
                  <Link href="/catalog/elochnye-igrushki">Ёлочные игрушки</Link>
                  <Link href="/catalog">Весь каталог</Link>
                </nav>
              </section>
            </Fragment>
          }
        />
      </CartProvider>
    </SessionProvider>
  );
}
