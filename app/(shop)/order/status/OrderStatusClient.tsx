"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { formatPrice } from "../../catalog/catalog-utils";
import type { OrderSummary } from "@/lib/orders";

export default function OrderStatusClient({ order, token }: { order: OrderSummary; token: string }) {
  if (order.status === "paid" || order.status === "fulfilled") {
    return <OrderConfirmation order={order} isGuest={order.userId === null} />;
  }

  if (order.status === "cancelled") {
    return (
      <section className="order-confirmation">
        <div className="order-confirmation__intro">
          <span aria-hidden="true">◇</span>
          <h2>Оплата не прошла</h2>
          <p>Заказ №{order.id} не оплачен, ничего не списано. Вы можете вернуться в корзину и попробовать снова.</p>
        </div>
        <div className="order-confirmation__actions">
          <Link href="/catalog/cart">Вернуться в корзину</Link>
        </div>
      </section>
    );
  }

  return <PendingPayment order={order} token={token} />;
}

function PendingPayment({ order, token }: { order: OrderSummary; token: string }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function handleRetry() {
    setState("loading");
    const res = await fetch("/api/order/status/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);

    if (!res || !res.ok) {
      setState("error");
      return;
    }

    const body = await res.json();
    window.location.href = body.confirmationUrl;
  }

  return (
    <section className="order-confirmation">
      <div className="order-confirmation__intro">
        <span aria-hidden="true">◇</span>
        <h2>Оплата ещё не завершена</h2>
        <p>Заказ №{order.id} ожидает оплаты. Если платёжная страница ЮKassa не открылась или была закрыта, вернитесь к оплате ниже.</p>
      </div>
      {state === "error" && (
        <p className="order-confirmation__offer-error" role="alert">Не получилось перейти к оплате. Попробуйте ещё раз.</p>
      )}
      <div className="order-confirmation__actions">
        <button type="button" onClick={handleRetry} disabled={state === "loading"}>
          {state === "loading" ? "Переходим…" : "Перейти к оплате"}
        </button>
      </div>
    </section>
  );
}

function OrderConfirmation({ order, isGuest }: { order: OrderSummary; isGuest: boolean }) {
  return (
    <section className="order-confirmation">
      <div className="order-confirmation__intro">
        <span aria-hidden="true">◇</span>
        <h2>Заказ №{order.id} оплачен</h2>
        <p>Подтверждение отправлено на {order.contactEmail}. Мы свяжемся с вами, чтобы согласовать доставку.</p>
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
      {order.cdekPvzAddress && (
        <p className="order-confirmation__delivery">
          Пункт выдачи СДЭК: {order.cdekPvzCity ? `${order.cdekPvzCity}, ` : ""}{order.cdekPvzAddress}
        </p>
      )}
      <div className="order-confirmation__actions">
        <Link href="/catalog">Продолжить покупки</Link>
      </div>
      {isGuest && <PostPurchaseAccountOffer order={order} />}
    </section>
  );
}

function PostPurchaseAccountOffer({ order }: { order: OrderSummary }) {
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
