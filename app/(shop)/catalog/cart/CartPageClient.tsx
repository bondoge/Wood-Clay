"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useCart, type CartLine } from "../CartContext";
import { CatalogFooter, CatalogHeader } from "../catalog-components";
import { formatPrice } from "../catalog-utils";

type CheckoutDefaults = { name: string; phone: string; email: string } | null;

type OrderItem = { productId: number | null; title: string; slug: string; priceRub: number; quantity: number };
type OrderResult = {
  id: number;
  contactEmail: string;
  contactName: string;
  totalRub: number;
  items: OrderItem[];
};

const CHECKOUT_ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Проверьте правильность заполнения формы.",
  empty_cart: "Корзина пуста.",
  unavailable: "Одно из изделий больше не доступно. Обновите корзину.",
  out_of_stock: "Нужное количество уже разобрали. Уменьшите количество и попробуйте снова.",
  too_many_requests: "Слишком много попыток. Попробуйте позже.",
};

export default function CartPageClient({
  totalProductCount,
  checkoutDefaults,
}: {
  totalProductCount: number;
  checkoutDefaults: CheckoutDefaults;
}) {
  const { lines, itemCount, total, removeItem, setQuantity, clearCart } = useCart();
  const [order, setOrder] = useState<OrderResult | null>(null);

  return (
    <main className="catalog-page cart-page">
      <CatalogHeader />

      {order ? (
        <OrderConfirmation order={order} isGuest={checkoutDefaults === null} />
      ) : (
        <>
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
              <CheckoutPreparation
                itemCount={itemCount}
                total={total}
                defaults={checkoutDefaults}
                lines={lines}
                onOrderCreated={(created) => {
                  clearCart();
                  setOrder(created);
                }}
              />
            </>
          ) : (
            <section className="cart-page__empty">
              <span aria-hidden="true">◇</span>
              <h2>Вы пока ничего не выбрали</h2>
              <p>В каталоге {totalProductCount} фарфоровых {pluralizeItems(totalProductCount)} в наличии.</p>
              <Link href="/catalog">Перейти в каталог</Link>
            </section>
          )}
        </>
      )}

      <CatalogFooter />
    </main>
  );
}

function CheckoutPreparation({
  itemCount,
  total,
  defaults,
  lines,
  onOrderCreated,
}: {
  itemCount: number;
  total: number;
  defaults: CheckoutDefaults;
  lines: CartLine[];
  onOrderCreated: (order: OrderResult) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const contact = {
      name: String(data.get("customer-name") ?? "").trim(),
      phone: String(data.get("customer-phone") ?? "").trim(),
      email: String(data.get("customer-email") ?? "").trim(),
    };
    const delivery = {
      city: String(data.get("delivery-city") ?? "").trim(),
      address: String(data.get("delivery-address") ?? "").trim(),
      note: String(data.get("delivery-note") ?? "").trim() || undefined,
    };
    const consent = data.get("consent") === "on";

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        contact,
        delivery,
        consent,
      }),
    }).catch(() => null);

    setSubmitting(false);

    if (!res || !res.ok) {
      const body = await res?.json().catch(() => null);
      setError(CHECKOUT_ERROR_MESSAGES[body?.error as string] ?? "Не получилось оформить заказ. Попробуйте ещё раз.");
      return;
    }

    const body = await res.json();
    onOrderCreated(body.order);
  }

  return (
    <section className="checkout-preparation" id="checkout" aria-labelledby="checkout-heading">
      <header className="checkout-preparation__heading">
        <div><p className="catalog-eyebrow">Следующий шаг</p><h2 id="checkout-heading">Оформление заказа</h2></div>
        <p>Укажите данные получателя и выберите удобные способы доставки и оплаты.</p>
      </header>
      <form className="checkout-grid" data-checkout-form onSubmit={handleSubmit}>
        <div className="checkout-steps">
          <fieldset className="checkout-step">
            <legend><span>01</span><strong>Получатель</strong></legend>
            <div className="checkout-fields">
              <label><span>Имя и фамилия</span><input type="text" name="customer-name" autoComplete="name" required placeholder="Как к вам обращаться" defaultValue={defaults?.name ?? ""} /></label>
              <label><span>Телефон</span><input type="tel" name="customer-phone" autoComplete="tel" required placeholder="+7 900 000-00-00" defaultValue={defaults?.phone ?? ""} /></label>
              <label className="checkout-fields__wide"><span>Email для чека</span><input type="email" name="customer-email" autoComplete="email" required placeholder="name@example.com" defaultValue={defaults?.email ?? ""} /></label>
            </div>
          </fieldset>
          <fieldset className="checkout-step checkout-integration" data-integration="cdek">
            <legend><span>02</span><strong>Доставка СДЭК</strong></legend>
            <div className="checkout-integration__intro"><p>Выберите удобный способ получения заказа.</p></div>
            <div className="checkout-option-grid" id="cdek-widget-root">
              <label><input type="radio" name="delivery" value="cdek-pickup" defaultChecked /><span><strong>Пункт выдачи</strong><small>Рядом с домом или работой</small></span><em>Выбрать</em></label>
              <label><input type="radio" name="delivery" value="cdek-courier" /><span><strong>Курьер</strong><small>Доставка до двери</small></span><em>Выбрать</em></label>
            </div>
            <p className="checkout-integration__note">
              Точный выбор пункта выдачи появится после подключения СДЭК — пока укажите город и адрес, чтобы мы могли согласовать доставку.
            </p>
            <div className="checkout-fields">
              <label><span>Город</span><input type="text" name="delivery-city" autoComplete="address-level2" required placeholder="Москва" /></label>
              <label><span>Адрес</span><input type="text" name="delivery-address" autoComplete="street-address" required placeholder="Улица, дом, квартира" /></label>
              <label className="checkout-fields__wide"><span>Комментарий к доставке <small>необязательно</small></span><input type="text" name="delivery-note" placeholder="Ориентир, удобное время" /></label>
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
          {error && <p className="checkout-order__error" role="alert">{error}</p>}
          <label className="consent-check">
            <input type="checkbox" name="consent" required />
            <span>Согласен(на) с <Link href="/privacy">политикой конфиденциальности</Link> и обработкой персональных данных</span>
          </label>
          <button type="submit" disabled={submitting}>{submitting ? "Оформляем…" : "Перейти к оплате"}</button>
        </aside>
      </form>
    </section>
  );
}

function OrderConfirmation({ order, isGuest }: { order: OrderResult; isGuest: boolean }) {
  return (
    <section className="order-confirmation">
      <div className="order-confirmation__intro">
        <span aria-hidden="true">◇</span>
        <h2>Заказ №{order.id} оформлен</h2>
        <p>Подтверждение отправлено на {order.contactEmail}. Мы свяжемся с вами, чтобы согласовать оплату и доставку.</p>
      </div>
      <div className="order-confirmation__items">
        {order.items.map((item) => (
          <div key={`${item.productId}-${item.title}`}>
            <span>{item.title} × {item.quantity}</span>
            <span>{formatPrice(item.priceRub * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="order-confirmation__total"><span>Итого</span><span>{formatPrice(order.totalRub)}</span></div>
      <div className="order-confirmation__actions">
        <Link href="/catalog">Продолжить покупки</Link>
      </div>
      {isGuest && <PostPurchaseAccountOffer order={order} />}
    </section>
  );
}

function PostPurchaseAccountOffer({ order }: { order: OrderResult }) {
  const [visible, setVisible] = useState(true);
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState("");

  if (!visible) return null;
  if (state === "done") {
    return (
      <div className="order-confirmation__offer">
        <p>Аккаунт создан — этот и будущие заказы теперь в личном кабинете.</p>
      </div>
    );
  }

  const [firstName, ...rest] = order.contactName.trim().split(/\s+/).filter(Boolean);
  const lastName = rest.join(" ") || undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError("");

    const res = await fetch("/api/account/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: order.contactEmail,
        password,
        firstName: firstName || undefined,
        lastName,
        consent,
        linkOrderId: order.id,
      }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const body = await res?.json().catch(() => null);
      setState("error");
      setError(
        body?.error === "email_taken"
          ? "Этот email уже зарегистрирован. Войдите, чтобы увидеть заказ в личном кабинете."
          : "Не получилось создать аккаунт. Попробуйте позже.",
      );
      return;
    }

    await signIn("credentials", { email: order.contactEmail, password, redirect: false });
    setState("done");
  }

  return (
    <form className="order-confirmation__offer" onSubmit={handleSubmit}>
      <p>Сохранить эти данные для следующего заказа? Создайте аккаунт в один шаг — email и имя уже заполнены.</p>
      <div className="checkout-fields">
        <label className="checkout-fields__wide">
          <span>Пароль <small>не менее 8 символов</small></span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
      </div>
      {state === "error" && <p className="order-confirmation__offer-error" role="alert">{error}</p>}
      <label className="consent-check">
        <input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>Согласен(на) с <Link href="/privacy">политикой конфиденциальности</Link> и обработкой персональных данных</span>
      </label>
      <div className="order-confirmation__offer-footer">
        <button type="button" onClick={() => setVisible(false)}>Пропустить</button>
        <button type="submit" disabled={state === "submitting"}>{state === "submitting" ? "Создаём…" : "Создать аккаунт"}</button>
      </div>
    </form>
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
