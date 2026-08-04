"use client";

import Link from "next/link";
import AddToCartButton from "./AddToCartButton";
import { makeTelegramOrder, useCart } from "./CartContext";
import type { ProductView } from "./product-view";
import { formatPrice } from "./catalog-utils";

export function CatalogHeader() {
  return (
    <header className="catalog-nav">
      <Link className="catalog-brand" href="/" aria-label="Wood&Clay — на главную">
        <img src="/woodclay-mark.png" alt="" width="76" height="58" />
        <img src="/woodclay-wordmark.svg" alt="Wood&Clay" width="100" height="19" />
      </Link>

      <nav aria-label="Основная навигация">
        <Link href="/">Главная</Link>
        <Link href="/#about">О нас</Link>
        <Link href="/#custom">Корпоративным клиентам</Link>
      </nav>

      <div className="catalog-nav__actions">
        <Link className="is-current" href="/catalog">Каталог</Link>
        <Link href="/#account">Мой кабинет</Link>
        <MiniCart />
      </div>
    </header>
  );
}

function MiniCart() {
  const { lines, itemCount, total, drawerOpen, setDrawerOpen, removeItem } = useCart();

  return (
    <div className="mini-cart">
      <button
        className="mini-cart__trigger"
        type="button"
        aria-expanded={drawerOpen}
        aria-controls="mini-cart-panel"
        onClick={() => setDrawerOpen(!drawerOpen)}
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
              <a href={makeTelegramOrder(lines)} target="_blank" rel="noreferrer">Оформить заказ ↗</a>
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
            <AddToCartButton product={product} className="product-card__add" />
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
            <Link href="/#custom">Корпоративным клиентам</Link>
            <Link href="/catalog">Каталог</Link>
            <Link href="/#account">Личный кабинет</Link>
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
            <span className="footer-link--disabled" aria-disabled="true">Instagram <small>скоро</small></span>
          </div>
        </div>

        <div className="site-footer__meta">
          <span>© 2026 Wood&Clay</span>
          <span>Сделано вручную в России</span>
          <a href="mailto:woodandclay.help@mail.ru">Нужна помощь?</a>
        </div>
      </div>

      <Link className="footer-wordmark" href="/" aria-label="Wood&Clay — на главную">
        <span className="footer-wordmark__texture" aria-hidden="true" />
      </Link>
    </footer>
  );
}
