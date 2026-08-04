"use client";

import Link from "next/link";
import { makeTelegramOrder, useCart } from "../CartContext";
import { CatalogFooter, CatalogHeader } from "../catalog-components";
import { formatPrice } from "../catalog-utils";

export default function CartPageClient() {
  const { lines, itemCount, total, removeItem, setQuantity, clearCart } = useCart();

  return (
    <main className="catalog-page cart-page">
      <CatalogHeader />
      <section className="cart-page__hero">
        <p className="catalog-eyebrow">Ваш выбор</p>
        <h1>Корзина</h1>
        <p>{itemCount > 0 ? `${itemCount} ${pluralizeItems(itemCount)} готовы к оформлению` : "Здесь появятся выбранные изделия"}</p>
      </section>

      {lines.length > 0 ? (
        <section className="cart-layout">
          <div className="cart-list">
            {lines.map((line) => (
              <article className="cart-line" key={line.product.id}>
                <Link href={`/catalog/${line.product.slug}`} className="cart-line__image">
                  <img src={line.product.images[0]} alt={line.product.title} width="260" height="310" />
                </Link>
                <div className="cart-line__body">
                  <p>{line.product.styleLabel} · {line.product.type}</p>
                  <Link href={`/catalog/${line.product.slug}`}><h2>{line.product.title}</h2></Link>
                  <span>Артикул {line.product.article}</span>
                  <div className="cart-line__controls">
                    <div className="cart-quantity" aria-label={`Количество: ${line.quantity}`}>
                      <button type="button" onClick={() => setQuantity(line.product.id, line.quantity - 1)} aria-label="Уменьшить количество">−</button>
                      <span>{line.quantity}</span>
                      <button type="button" onClick={() => setQuantity(line.product.id, line.quantity + 1)} aria-label="Увеличить количество">+</button>
                    </div>
                    <button className="cart-line__remove" type="button" onClick={() => removeItem(line.product.id)}>Удалить</button>
                  </div>
                </div>
                <strong>{formatPrice(line.product.price * line.quantity)}</strong>
              </article>
            ))}
            <button className="cart-clear" type="button" onClick={clearCart}>Очистить корзину</button>
          </div>

          <aside className="cart-summary">
            <p className="catalog-eyebrow">Ваш заказ</p>
            <div><span>Товары · {itemCount}</span><span>{formatPrice(total)}</span></div>
            <div><span>Доставка</span><span>Уточнит консультант</span></div>
            <div className="cart-summary__total"><strong>Итого</strong><strong>{formatPrice(total)}</strong></div>
            <a href={makeTelegramOrder(lines)} target="_blank" rel="noreferrer">Оформить в Telegram <span aria-hidden="true">↗</span></a>
            <p>Мы подтвердим наличие, согласуем доставку и удобный способ оплаты лично.</p>
            <Link href="/catalog">← Продолжить покупки</Link>
          </aside>
        </section>
      ) : (
        <section className="cart-page__empty">
          <span aria-hidden="true">◇</span>
          <h2>Вы пока ничего не выбрали</h2>
          <p>В каталоге 713 фарфоровых изделий в наличии.</p>
          <Link href="/catalog">Перейти в каталог</Link>
        </section>
      )}
      <CatalogFooter />
    </main>
  );
}

function pluralizeItems(count: number) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 19) return "изделий";
  if (mod10 === 1) return "изделие";
  if (mod10 >= 2 && mod10 <= 4) return "изделия";
  return "изделий";
}
