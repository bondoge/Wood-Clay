"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AddToCartButton from "./AddToCartButton";
import { useCart } from "./CartContext";
import { CookieSettingsLink } from "@/components/analytics/CookieSettingsLink";
import type { ProductView } from "./product-view";
import { formatPrice } from "./catalog-utils";

export function CatalogHeader({ current = "catalog" }: { current?: "catalog" | "account" }) {
  return (
    <header className="catalog-nav">
      <Link className="catalog-brand" href="/" aria-label="Wood&Clay — на главную">
        <img src="/woodclay-mark.png" alt="" width="76" height="58" />
        <img src="/woodclay-wordmark.svg" alt="Wood&Clay" width="100" height="19" />
      </Link>

      <nav aria-label="Основная навигация">
        <Link href="/">Главная</Link>
        <Link href="/o-nas">О нас</Link>
        <Link href="/korporativnye-podarki">Корпоративным клиентам</Link>
        <Link href="/kontakty">Контакты</Link>
      </nav>

      <div className="catalog-nav__actions">
        <HeaderAccountActions current={current} />
        <MobileNavToggle>
          <Link href="/">Главная</Link>
          <Link href="/o-nas">О нас</Link>
          <Link href="/korporativnye-podarki">Корпоративным клиентам</Link>
          <Link href="/kontakty">Контакты</Link>
          <MobileAccountLink />
        </MobileNavToggle>
      </div>
    </header>
  );
}

// Hamburger toggle + link panel for the header nav that both .site-header
// (home page) and .catalog-nav (every other page) hide outright below their
// respective breakpoints — see .mobile-nav rules in globals.css/catalog.css.
// Each caller passes its own links (the "Главная" href differs: "#top" on
// the home page's own header vs "/" everywhere else), so this only owns the
// toggle/panel behaviour, not the link list.
export function MobileNavToggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="mobile-nav" ref={rootRef}>
      <button
        type="button"
        className="mobile-nav__toggle"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Закрыть меню" : "Открыть меню"}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <div
        id="mobile-nav-panel"
        className={`mobile-nav__panel${open ? " is-open" : ""}`}
        aria-label="Основная навигация"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        {children}
      </div>
    </div>
  );
}

// The header's account/register link, duplicated inside the mobile nav
// panel — see the ">a[href=\"/account/register\"], >a.catalog-nav__account"
// hide rules in globals.css/catalog.css. Below the breakpoint where the
// toggle appears, the visible action row (Каталог + cart + toggle) is
// already at its width limit, so "Создать аккаунт"/"Кабинет" moves into the
// panel instead of being dropped.
export function MobileAccountLink() {
  const { data: session } = useSession();
  const displayName = session?.user?.name?.trim();
  return session?.user ? (
    <Link href="/account">{displayName || "Кабинет"}</Link>
  ) : (
    <Link href="/account/register">Создать аккаунт</Link>
  );
}

// Shared with the home page's own header (see app/HomeClient.tsx) so the
// catalog/account/cart cluster is identical everywhere — same links, same
// session-awareness, same cart drawer — rather than two hand-kept copies.
export function HeaderAccountActions({ current }: { current?: "catalog" | "account" }) {
  const { data: session } = useSession();
  const displayName = session?.user?.name?.trim();
  const initial = (displayName?.[0] ?? session?.user?.email?.[0] ?? "").toUpperCase();

  return (
    <>
      <Link className={current === "catalog" ? "is-current" : undefined} href="/catalog">Каталог</Link>
      {session?.user ? (
        <Link className={`catalog-nav__account${current === "account" ? " is-current" : ""}`} href="/account">
          <span className="catalog-nav__avatar" aria-hidden="true">{initial}</span>
          <span className="catalog-nav__name">{displayName || "Кабинет"}</span>
        </Link>
      ) : (
        <Link className={current === "account" ? "is-current" : undefined} href="/account/register">Создать аккаунт</Link>
      )}
      <MiniCart />
    </>
  );
}

function MiniCart() {
  const {
    lines, itemCount, total, drawerOpen, lastAdded,
    setDrawerOpen, dismissAddedNotice, removeItem,
  } = useCart();
  const cartRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!cartRootRef.current?.contains(event.target as Node)) setDrawerOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawerOpen, setDrawerOpen]);

  return (
    <div className="mini-cart" ref={cartRootRef}>
      <button
        className="mini-cart__trigger"
        type="button"
        aria-expanded={drawerOpen}
        aria-controls="mini-cart-panel"
        onClick={() => {
          dismissAddedNotice();
          setDrawerOpen(!drawerOpen);
        }}
      >
        <span>Корзина</span>
        <b>{itemCount}</b>
      </button>

      <aside className={`mini-cart__panel${drawerOpen ? " is-open" : ""}`} id="mini-cart-panel" aria-label="Корзина">
        <header>
          <div>
            <small>Ваш выбор</small>
            <strong>Корзина · {itemCount}</strong>
          </div>
          <button type="button" aria-label="Закрыть корзину" onClick={() => setDrawerOpen(false)}>×</button>
        </header>

        {lines.length > 0 ? (
          <>
            <div className="mini-cart__items">
              {lines.slice(0, 3).map((line) => (
                <div className="mini-cart__item" key={line.product.id}>
                  <img src={line.product.images[0]} alt="" width="76" height="90" />
                  <div>
                    <Link href={`/catalog/${line.product.slug}`} onClick={() => setDrawerOpen(false)}>{line.product.title}</Link>
                    <span>{line.quantity} × {formatPrice(line.product.price)}</span>
                  </div>
                  <button type="button" aria-label={`Удалить ${line.product.title}`} onClick={() => removeItem(line.product.id)}>×</button>
                </div>
              ))}
              {lines.length > 3 && <p className="mini-cart__more">И ещё {lines.length - 3}</p>}
            </div>
            <div className="mini-cart__summary"><span>Итого</span><strong>{formatPrice(total)}</strong></div>
            <div className="mini-cart__actions">
              <Link href="/catalog/cart" onClick={() => setDrawerOpen(false)}>Открыть корзину</Link>
            </div>
          </>
        ) : (
          <div className="mini-cart__empty">
            <span aria-hidden="true">◇</span>
            <strong>Корзина пока пуста</strong>
            <p>Добавляйте понравившиеся изделия — они останутся здесь.</p>
          </div>
        )}
      </aside>

      <div className={`cart-added-notice${lastAdded ? " is-visible" : ""}`} role="status" aria-live="polite" aria-atomic="true">
        {lastAdded && (
          <>
            <img src={lastAdded.images[0]} alt="" width="52" height="62" />
            <div><strong>Добавлено в корзину</strong><span>{lastAdded.title}</span></div>
            <Link href="/catalog/cart" onClick={dismissAddedNotice}>Корзина</Link>
          </>
        )}
      </div>
    </div>
  );
}

export function ProductCard({ product }: { product: ProductView }) {
  const secondImage = product.images[1];

  return (
    <article className="product-card">
      <Link className="product-card__media" href={`/catalog/${product.slug}`}>
        <img
          className="product-card__image product-card__image--primary"
          src={product.images[0]}
          alt={product.title}
          width="700"
          height="900"
          loading="lazy"
          decoding="async"
        />
        {secondImage && (
          <img
            className="product-card__image product-card__image--secondary"
            src={secondImage}
            alt=""
            width="700"
            height="900"
            loading="lazy"
            decoding="async"
          />
        )}
        <span className={`product-card__style product-card__style--${product.style}`}>
          {product.styleLabel}
        </span>
        {product.stock <= 4 && <span className="product-card__scarcity">Осталось мало</span>}
        <span className="product-card__open" aria-hidden="true">↗</span>
      </Link>

      <div className="product-card__body">
        <p className="product-card__type">{product.type}</p>
        <Link href={`/catalog/${product.slug}`}>
          <h2>{product.title}</h2>
        </Link>
        <p className="product-card__description">{product.description}</p>
        <div className="product-card__footer">
          <strong>{formatPrice(product.price)}</strong>
          <div>
            <Link href={`/catalog/${product.slug}`} aria-label={`Подробнее о ${product.title}`}>Подробнее</Link>
            <AddToCartButton product={product} className="product-card__add" shortLabel />
          </div>
        </div>
      </div>
    </article>
  );
}

export function CatalogFooter() {
  return (
    <footer className="site-footer catalog-site-footer" id="contacts">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Link className="footer-brand" href="/" aria-label="Wood&Clay — на главную">
              <img src="/woodclay-mark.png" alt="" width="76" height="58" />
              <img src="/woodclay-wordmark.svg" alt="Wood&Clay" width="100" height="19" />
            </Link>
            <p>Фарфоровые игрушки и фигурки, расписанные вручную.</p>
          </div>

          <nav className="footer-column" aria-label="Навигация по сайту">
            <p>Навигация</p>
            <Link href="/">Главная</Link>
            <Link href="/o-nas">О нас</Link>
            <Link href="/kontakty">Контакты</Link>
            <Link href="/korporativnye-podarki">Корпоративным клиентам</Link>
            <Link href="/catalog">Каталог</Link>
            <Link href="/account">Личный кабинет</Link>
            <Link href="/oferta">Оферта</Link>
            <Link href="/vozvrat">Возврат и обмен</Link>
            <Link href="/rekvizity">Реквизиты</Link>
            <Link href="/privacy">Политика конфиденциальности</Link>
          </nav>

          <div className="footer-column footer-column--contacts">
            <p>Связаться</p>
            <a href="mailto:woodandclay.help@mail.ru">woodandclay.help@mail.ru <span aria-hidden="true">↗</span></a>
            <a href="tel:+79153909884">+7 915 390-98-84 <span aria-hidden="true">↗</span></a>
            <a href="https://t.me/Kiss_Love_odsk" target="_blank" rel="noreferrer">Telegram <span aria-hidden="true">↗</span></a>
          </div>

          <div className="footer-column footer-column--social">
            <p>Социальные сети</p>
            <a href="https://t.me/Kiss_Love_odsk" target="_blank" rel="noreferrer">Telegram</a>
          </div>
        </div>

        <div className="site-footer__meta">
          <span>© 2026 Wood&Clay</span>
          <span>Сделано вручную в России</span>
          <span className="site-footer__meta-end">
            <Link href="/privacy">Политика конфиденциальности</Link>
            <CookieSettingsLink />
          </span>
        </div>
      </div>

      <Link className="footer-wordmark" href="/" aria-label="Wood&Clay — на главную">
        <span className="footer-wordmark__texture" aria-hidden="true" />
      </Link>
    </footer>
  );
}
