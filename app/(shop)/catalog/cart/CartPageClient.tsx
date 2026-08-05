"use client";

import Link from "next/link";
import { useCart } from "../CartContext";
import { CatalogFooter, CatalogHeader } from "../catalog-components";
import { formatPrice } from "../catalog-utils";

export default function CartPageClient({ totalProductCount }: { totalProductCount: number }) {
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
        <>
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
              <div><span>Доставка</span><span>После выбора адреса</span></div>
              <div className="cart-summary__total"><strong>Итого</strong><strong>{formatPrice(total)}</strong></div>
              <a href="#checkout">Перейти к оформлению <span aria-hidden="true">↓</span></a>
              <p>Точную стоимость доставки покажем после выбора способа получения.</p>
              <Link href="/catalog">← Продолжить покупки</Link>
            </aside>
          </section>
          <CheckoutPreparation itemCount={itemCount} total={total} />
        </>
      ) : (
        <section className="cart-page__empty">
          <span aria-hidden="true">◇</span>
          <h2>Вы пока ничего не выбрали</h2>
          <p>В каталоге {totalProductCount} фарфоровых {pluralizeItems(totalProductCount)} в наличии.</p>
          <Link href="/catalog">Перейти в каталог</Link>
        </section>
      )}
      <CatalogFooter />
    </main>
  );
}

function CheckoutPreparation({ itemCount, total }: { itemCount: number; total: number }) {
  return (
    <section className="checkout-preparation" id="checkout" aria-labelledby="checkout-heading">
      <header className="checkout-preparation__heading">
        <div><p className="catalog-eyebrow">Следующий шаг</p><h2 id="checkout-heading">Оформление заказа</h2></div>
        <p>Укажите данные получателя и выберите удобные способы доставки и оплаты.</p>
      </header>
      <form className="checkout-grid" data-checkout-form onSubmit={(event) => event.preventDefault()}>
        <div className="checkout-steps">
          <fieldset className="checkout-step">
            <legend><span>01</span><strong>Получатель</strong></legend>
            <div className="checkout-fields">
              <label><span>Имя и фамилия</span><input type="text" name="customer-name" autoComplete="name" placeholder="Как к вам обращаться" /></label>
              <label><span>Телефон</span><input type="tel" name="customer-phone" autoComplete="tel" placeholder="+7 900 000-00-00" /></label>
              <label className="checkout-fields__wide"><span>Email для чека</span><input type="email" name="customer-email" autoComplete="email" placeholder="name@example.com" /></label>
            </div>
          </fieldset>
          <fieldset className="checkout-step checkout-integration" data-integration="cdek">
            <legend><span>02</span><strong>Доставка СДЭК</strong></legend>
            <div className="checkout-integration__intro"><p>Выберите удобный способ получения заказа.</p></div>
            <div className="checkout-option-grid" id="cdek-widget-root">
              <label><input type="radio" name="delivery" value="cdek-pickup" defaultChecked /><span><strong>Пункт выдачи</strong><small>Рядом с домом или работой</small></span><em>Выбрать</em></label>
              <label><input type="radio" name="delivery" value="cdek-courier" /><span><strong>Курьер</strong><small>Доставка до двери</small></span><em>Выбрать</em></label>
            </div>
          </fieldset>
          <fieldset className="checkout-step checkout-integration" data-integration="yookassa">
            <legend><span>03</span><strong>Оплата</strong></legend>
            <label className="checkout-payment" id="yookassa-payment-root"><input type="radio" name="payment" value="yookassa" defaultChecked /><span className="checkout-payment__mark">Ю</span><span><strong>ЮKassa</strong><small>Банковская карта, СБП, SberPay или T-Pay</small></span><em>Безопасно</em></label>
          </fieldset>
        </div>
        <aside className="checkout-order">
          <p className="catalog-eyebrow">К оплате</p>
          <div><span>{itemCount} {pluralizeItems(itemCount)}</span><span>{formatPrice(total)}</span></div>
          <div><span>Доставка СДЭК</span><span>После выбора адреса</span></div>
          <div className="checkout-order__total"><strong>Итого</strong><strong>{formatPrice(total)}</strong></div>
          <button type="submit">Перейти к оплате</button>
          <p>Нажимая кнопку, вы соглашаетесь с <Link href="/privacy">политикой конфиденциальности</Link>.</p>
        </aside>
      </form>
    </section>
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
