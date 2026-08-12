"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCart, type CartLine } from "../CartContext";
import { CatalogFooter, CatalogHeader } from "../catalog-components";
import { formatPrice } from "../catalog-utils";
import CdekPvzPicker, { type CdekPvz } from "./CdekPvzPicker";
import { formatRuPhoneInput } from "@/lib/phone";

type CheckoutDefaults = { name: string; phone: string; email: string } | null;

const CHECKOUT_ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Проверьте правильность заполнения формы.",
  empty_cart: "Корзина пуста.",
  unavailable: "Одно из изделий больше не доступно. Обновите корзину.",
  out_of_stock: "Нужное количество уже разобрали. Уменьшите количество и попробуйте снова.",
  too_many_requests: "Слишком много попыток. Попробуйте позже.",
  payment_failed: "Заказ оформлен, но переход к оплате не удался. Мы перенаправим вас — попробуйте ещё раз со страницы заказа.",
};

export default function CartPageClient({
  totalProductCount,
  checkoutDefaults,
  defaultPvz,
  shippingCost,
}: {
  totalProductCount: number;
  checkoutDefaults: CheckoutDefaults;
  defaultPvz: CdekPvz | null;
  // Passed down from the server component (page.tsx reads lib/shipping.ts
  // directly) rather than imported here — SHIPPING_FLAT_RATE_RUB reads a
  // non-NEXT_PUBLIC_ env var, which is undefined in browser JS, so importing
  // it in this client component silently fell back to the 450 default
  // regardless of the real (restart-only, no-rebuild) configured value.
  shippingCost: number;
}) {
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
              <div><span>Доставка СДЭК</span><span>{formatPrice(shippingCost)}</span></div>
              <div className="cart-summary__total"><strong>Итого</strong><strong>{formatPrice(total + shippingCost)}</strong></div>
              <a href="#checkout">Перейти к оформлению <span aria-hidden="true">↓</span></a>
              <p>Фиксированная стоимость доставки СДЭК до выбранного пункта выдачи.</p>
              <Link href="/catalog">← Продолжить покупки</Link>
            </aside>
          </section>
          <CheckoutPreparation itemCount={itemCount} total={total} defaults={checkoutDefaults} defaultPvz={defaultPvz} lines={lines} shippingCost={shippingCost} />
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

function CheckoutPreparation({
  itemCount,
  total,
  defaults,
  defaultPvz,
  lines,
  shippingCost,
}: {
  itemCount: number;
  total: number;
  defaults: CheckoutDefaults;
  defaultPvz: CdekPvz | null;
  lines: CartLine[];
  shippingCost: number;
}) {
  const { data: session } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pvz, setPvz] = useState<CdekPvz | null>(defaultPvz);
  // Tracks the account's current default pickup point (by СДЭК code), so a
  // different pick can be told apart from just re-confirming the same one.
  // null means "no saved address yet" — the very next save becomes default
  // automatically server-side (lib/account.ts's saveAddress), no need to ask.
  const [defaultCode, setDefaultCode] = useState<string | null>(defaultPvz?.code ?? null);
  const [defaultPrompt, setDefaultPrompt] = useState<{ id: number; pvz: CdekPvz } | null>(null);
  const grandTotal = total + shippingCost;

  const handlePvzChange = (newPvz: CdekPvz) => {
    setPvz(newPvz);
    setDefaultPrompt(null);
    if (!session?.user) return;

    void fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cdekPvzCode: newPvz.code, cdekPvzCity: newPvz.city, cdekPvzAddress: newPvz.address }),
    })
      .then(async (res) => {
        if (!res.ok) return;
        const body = await res.json().catch(() => null);
        const savedId: number | undefined = body?.address?.id;

        if (defaultCode === null) {
          // First address ever for this account — already made default
          // server-side, nothing to ask.
          setDefaultCode(newPvz.code);
          return;
        }
        if (newPvz.code !== defaultCode && savedId) {
          setDefaultPrompt({ id: savedId, pvz: newPvz });
        }
      })
      .catch((err) => console.error("Failed to save pickup point to account:", err));
  };

  const confirmMakeDefault = async () => {
    if (!defaultPrompt) return;
    const res = await fetch(`/api/account/addresses/${defaultPrompt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    }).catch(() => null);
    if (res?.ok) setDefaultCode(defaultPrompt.pvz.code);
    setDefaultPrompt(null);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pvz) {
      setError("Выберите пункт выдачи СДЭК.");
      return;
    }

    const data = new FormData(event.currentTarget);
    const contact = {
      name: String(data.get("customer-name") ?? "").trim(),
      phone: String(data.get("customer-phone") ?? "").trim(),
      email: String(data.get("customer-email") ?? "").trim(),
    };
    const delivery = {
      cdekPvzCode: pvz.code,
      cdekPvzCity: pvz.city,
      cdekPvzAddress: pvz.address,
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

    const body = await res?.json().catch(() => null);

    if (!res || !res.ok) {
      // The order itself may still have been created (payment_failed) —
      // send the customer to its status page rather than stranding them,
      // where they can retry payment for that same order. The cart stays
      // intact until OrderStatusClient sees the order actually paid — not
      // here, since nothing has been paid yet.
      if (body?.error === "payment_failed" && body?.returnToken) {
        window.location.href = `/order/status?token=${body.returnToken}`;
        return;
      }
      setSubmitting(false);
      setError(CHECKOUT_ERROR_MESSAGES[body?.error as string] ?? "Не получилось оформить заказ. Попробуйте ещё раз.");
      return;
    }

    // Not clearing the cart here: the customer hasn't paid yet, and may
    // abandon the ЮKassa page and come back. OrderStatusClient clears it
    // once the order is confirmed paid.
    window.location.href = body.confirmationUrl;
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
              <label><span>Телефон</span><input type="tel" name="customer-phone" autoComplete="tel" required placeholder="+7 900 000-00-00" defaultValue={defaults?.phone ?? ""} onChange={(event) => { event.target.value = formatRuPhoneInput(event.target.value); }} /></label>
              <label className="checkout-fields__wide"><span>Email для чека</span><input type="email" name="customer-email" autoComplete="email" required placeholder="name@example.com" defaultValue={defaults?.email ?? ""} /></label>
            </div>
          </fieldset>
          <fieldset className="checkout-step checkout-integration" data-integration="cdek">
            <legend><span>02</span><strong>Доставка СДЭК</strong></legend>
            <div className="checkout-integration__intro"><p>Выберите пункт выдачи, где будет удобно забрать заказ.</p></div>
            <CdekPvzPicker value={pvz} onChange={handlePvzChange} />
            {defaultPrompt && (
              <div className="cdek-default-prompt" role="status">
                <p>Сделать это основным адресом?</p>
                <div>
                  <button type="button" onClick={() => void confirmMakeDefault()}>Да</button>
                  <button type="button" onClick={() => setDefaultPrompt(null)}>Нет</button>
                </div>
              </div>
            )}
          </fieldset>
          <fieldset className="checkout-step checkout-integration" data-integration="yookassa">
            <legend><span>03</span><strong>Оплата</strong></legend>
            <label className="checkout-payment" id="yookassa-payment-root"><input type="radio" name="payment" value="yookassa" defaultChecked /><span className="checkout-payment__mark">Ю</span><span><strong>ЮKassa</strong><small>Банковская карта, СБП, SberPay или T-Pay</small></span><em>Безопасно</em></label>
          </fieldset>
        </div>
        <aside className="checkout-order">
          <p className="catalog-eyebrow">К оплате</p>
          <div><span>{itemCount} {pluralizeItems(itemCount)}</span><span>{formatPrice(total)}</span></div>
          <div><span>Доставка СДЭК</span><span>{formatPrice(shippingCost)}</span></div>
          <div className="checkout-order__total"><strong>Итого</strong><strong>{formatPrice(grandTotal)}</strong></div>
          {error && <p className="checkout-order__error" role="alert">{error}</p>}
          <label className="consent-check">
            <input type="checkbox" name="consent" required />
            <span>Согласен(на) с <Link href="/privacy">политикой конфиденциальности</Link> и обработкой персональных данных</span>
          </label>
          <button type="submit" disabled={submitting || !pvz}>{submitting ? "Оформляем…" : "Перейти к оплате"}</button>
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
