"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CatalogFooter, CatalogHeader } from "../catalog/catalog-components";
import { useCart } from "../catalog/CartContext";
import { formatPrice } from "../catalog/catalog-utils";

type AccountSection = "overview" | "orders" | "cart" | "profile" | "addresses" | "payment";

const navigation: { id: AccountSection; label: string; icon: string }[] = [
  { id: "overview", label: "Обзор", icon: "⌂" },
  { id: "orders", label: "Заказы", icon: "□" },
  { id: "cart", label: "Корзина", icon: "◇" },
  { id: "profile", label: "Личные данные", icon: "○" },
  { id: "addresses", label: "Адреса", icon: "⌖" },
  { id: "payment", label: "Способы оплаты", icon: "—" },
];

export default function AccountClient() {
  const cart = useCart();
  const [activeSection, setActiveSection] = useState<AccountSection>("overview");
  const [savedMessage, setSavedMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [verificationTarget, setVerificationTarget] = useState<"phone" | "email" | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [verifiedContacts, setVerifiedContacts] = useState({ phone: false, email: false });
  const [resendSeconds, setResendSeconds] = useState(0);

  const cartPreview = useMemo(() => cart.lines.slice(0, 3), [cart.lines]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const selectSection = (section: AccountSection) => {
    setActiveSection(section);
    setSavedMessage("");
    window.requestAnimationFrame(() => {
      document.querySelector(".account-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const saveForm = (event: FormEvent<HTMLFormElement>, message: string) => {
    event.preventDefault();
    setSavedMessage(message);
  };

  const startVerification = (target: "phone" | "email") => {
    const isPhoneValid = phone.replace(/\D/g, "").length >= 10;
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if ((target === "phone" && !isPhoneValid) || (target === "email" && !isEmailValid)) {
      setVerificationError(target === "phone" ? "Проверьте номер телефона" : "Проверьте адрес электронной почты");
      return;
    }
    setVerificationTarget(target);
    setVerificationCode("");
    setVerificationError("");
    setResendSeconds(30);
  };

  const confirmVerification = () => {
    if (!verificationTarget) return;
    if (!/^\d{6}$/.test(verificationCode)) {
      setVerificationError("Введите шестизначный код");
      return;
    }
    setVerifiedContacts((current) => ({ ...current, [verificationTarget]: true }));
    setSavedMessage(verificationTarget === "phone" ? "Телефон подтверждён" : "Email подтверждён");
    setVerificationTarget(null);
    setVerificationCode("");
    setVerificationError("");
  };

  const maskedContact = verificationTarget === "phone" ? maskPhone(phone) : maskEmail(email);

  return (
    <main className="catalog-page account-page">
      <CatalogHeader current="account" />

      <section className="account-hero">
        <div>
          <p className="catalog-eyebrow">Ваше пространство Wood&amp;Clay</p>
          <h1>Личный кабинет</h1>
          <p>Заказы, адреса и сохранённая корзина — всё важное собрано в одном месте.</p>
        </div>
        <button type="button" className="account-hero__cart" onClick={() => selectSection("cart")}>
          <span>В корзине</span>
          <strong>{cart.itemCount}</strong>
          <small>{cart.itemCount ? formatPrice(cart.total) : "Можно начать с каталога"}</small>
          <i aria-hidden="true">↘</i>
        </button>
      </section>

      <section className="account-shell" aria-label="Разделы личного кабинета">
        <aside className="account-sidebar">
          <div className="account-sidebar__identity">
            <span aria-hidden="true">W</span>
            <div><strong>Ваш профиль</strong><small>Wood&amp;Clay</small></div>
          </div>
          <nav aria-label="Личный кабинет">
            {navigation.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={activeSection === item.id ? "page" : undefined}
                onClick={() => selectSection(item.id)}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
                {item.id === "cart" && cart.itemCount > 0 && <b>{cart.itemCount}</b>}
              </button>
            ))}
          </nav>
          <a className="account-sidebar__help" href="mailto:woodandclay.help@mail.ru">
            <span>Нужна помощь?</span>
            <small>Написать в поддержку</small>
            <i aria-hidden="true">↗</i>
          </a>
        </aside>

        <div className="account-content">
          {activeSection === "overview" && (
            <section className="account-panel" aria-labelledby="account-overview-title">
              <header className="account-panel__heading">
                <div><p className="catalog-eyebrow">Обзор</p><h2 id="account-overview-title">Всё под рукой</h2></div>
                <Link href="/catalog">Перейти в каталог <span aria-hidden="true">↗</span></Link>
              </header>

              <div className="account-stat-grid">
                <button type="button" onClick={() => selectSection("orders")}>
                  <span>Заказы</span><strong>0</strong><small>История покупок</small><i aria-hidden="true">→</i>
                </button>
                <button type="button" onClick={() => selectSection("cart")}>
                  <span>В корзине</span><strong>{cart.itemCount}</strong><small>{cart.itemCount ? formatPrice(cart.total) : "Корзина пуста"}</small><i aria-hidden="true">→</i>
                </button>
                <button type="button" onClick={() => selectSection("addresses")}>
                  <span>Адрес доставки</span><strong className="account-stat-grid__text">Не указан</strong><small>Добавьте для быстрого заказа</small><i aria-hidden="true">→</i>
                </button>
              </div>

              <div className="account-overview-grid">
                <article className="account-overview-card account-overview-card--cart">
                  <div className="account-overview-card__top">
                    <div><p>Сохранённая корзина</p><h3>{cart.itemCount ? `${cart.itemCount} ${pluralize(cart.itemCount)}` : "Пока пусто"}</h3></div>
                    {cart.itemCount > 0 && <span>{formatPrice(cart.total)}</span>}
                  </div>
                  {cartPreview.length > 0 ? (
                    <div className="account-cart-preview">
                      {cartPreview.map((line) => (
                        <Link href={`/catalog/${line.product.slug}`} key={line.product.id}>
                          <img src={line.product.images[0]} alt={line.product.title} width="88" height="105" />
                          <span>{line.quantity}</span>
                        </Link>
                      ))}
                      {cart.lines.length > 3 && <button type="button" onClick={() => selectSection("cart")}>+{cart.lines.length - 3}</button>}
                    </div>
                  ) : (
                    <p className="account-overview-card__empty">Добавляйте изделия из каталога — корзина сохранится для следующего визита.</p>
                  )}
                  <button type="button" onClick={() => selectSection("cart")}>{cart.itemCount ? "Посмотреть корзину" : "Открыть раздел"}<span aria-hidden="true">→</span></button>
                </article>

                <article className="account-overview-card account-overview-card--profile">
                  <p>Сделайте оформление быстрее</p>
                  <h3>Заполните профиль один раз</h3>
                  <p>Имя, телефон и адрес будут доступны при оформлении следующих заказов.</p>
                  <div className="account-progress" aria-label="Профиль не заполнен"><span style={{ width: "18%" }} /></div>
                  <button type="button" onClick={() => selectSection("profile")}>Заполнить данные <span aria-hidden="true">→</span></button>
                </article>
              </div>
            </section>
          )}

          {activeSection === "orders" && (
            <section className="account-panel" aria-labelledby="account-orders-title">
              <header className="account-panel__heading"><div><p className="catalog-eyebrow">История</p><h2 id="account-orders-title">Мои заказы</h2></div></header>
              <div className="account-empty-state">
                <span aria-hidden="true">◇</span>
                <h3>Заказов пока нет</h3>
                <p>После первой покупки здесь появятся состав заказа, статус доставки и документы.</p>
                <Link href="/catalog">Выбрать изделия</Link>
              </div>
            </section>
          )}

          {activeSection === "cart" && (
            <section className="account-panel" aria-labelledby="account-cart-title">
              <header className="account-panel__heading">
                <div><p className="catalog-eyebrow">Сохранено между визитами</p><h2 id="account-cart-title">Моя корзина</h2></div>
                {cart.itemCount > 0 && <strong>{formatPrice(cart.total)}</strong>}
              </header>
              {cart.lines.length > 0 ? (
                <>
                  <div className="account-cart-list">
                    {cart.lines.map((line) => (
                      <article key={line.product.id}>
                        <Link href={`/catalog/${line.product.slug}`}><img src={line.product.images[0]} alt={line.product.title} width="110" height="132" /></Link>
                        <div><small>{line.product.styleLabel} · {line.product.type}</small><Link href={`/catalog/${line.product.slug}`}>{line.product.title}</Link><span>{formatPrice(line.product.price)}</span></div>
                        <div className="account-cart-quantity">
                          <button type="button" onClick={() => cart.setQuantity(line.product.id, line.quantity - 1)} aria-label="Уменьшить количество">−</button>
                          <span>{line.quantity}</span>
                          <button type="button" onClick={() => cart.setQuantity(line.product.id, line.quantity + 1)} aria-label="Увеличить количество">+</button>
                        </div>
                        <button type="button" className="account-cart-remove" onClick={() => cart.removeItem(line.product.id)}>Удалить</button>
                      </article>
                    ))}
                  </div>
                  <div className="account-cart-actions"><Link href="/catalog">Продолжить покупки</Link><Link href="/catalog/cart">Оформить заказ <span aria-hidden="true">→</span></Link></div>
                </>
              ) : (
                <div className="account-empty-state"><span aria-hidden="true">◇</span><h3>Корзина пока пуста</h3><p>Все добавленные изделия будут сохранены здесь между визитами.</p><Link href="/catalog">Перейти в каталог</Link></div>
              )}
            </section>
          )}

          {activeSection === "profile" && (
            <section className="account-panel" aria-labelledby="account-profile-title">
              <header className="account-panel__heading"><div><p className="catalog-eyebrow">Личные данные</p><h2 id="account-profile-title">Профиль</h2></div><p>Используем эти данные только для заказов и связи с вами.</p></header>
              <form className="account-form" data-account-form="profile" onSubmit={(event) => saveForm(event, "Личные данные сохранены") }>
                <div className="account-form__grid">
                  <label><span>Имя</span><input name="firstName" autoComplete="given-name" placeholder="Ваше имя" /></label>
                  <label><span>Фамилия</span><input name="lastName" autoComplete="family-name" placeholder="Ваша фамилия" /></label>
                  <div className="account-contact-field">
                    <label htmlFor="account-phone">Телефон <small className={verifiedContacts.phone ? "is-verified" : ""}>{verifiedContacts.phone ? "✓ подтверждён" : "не подтверждён"}</small></label>
                    <span className="account-contact-field__control">
                      <input id="account-phone" type="tel" name="phone" autoComplete="tel" placeholder="+7 900 000-00-00" value={phone} onChange={(event) => { setPhone(event.target.value); setVerifiedContacts((current) => ({ ...current, phone: false })); }} />
                      <button type="button" data-verification-channel="phone" onClick={() => startVerification("phone")}>{verifiedContacts.phone ? "Изменить" : "Подтвердить"}</button>
                    </span>
                  </div>
                  <div className="account-contact-field">
                    <label htmlFor="account-email">Email <small className={verifiedContacts.email ? "is-verified" : ""}>{verifiedContacts.email ? "✓ подтверждён" : "не подтверждён"}</small></label>
                    <span className="account-contact-field__control">
                      <input id="account-email" type="email" name="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => { setEmail(event.target.value); setVerifiedContacts((current) => ({ ...current, email: false })); }} />
                      <button type="button" data-verification-channel="email" onClick={() => startVerification("email")}>{verifiedContacts.email ? "Изменить" : "Подтвердить"}</button>
                    </span>
                  </div>
                  {verificationTarget && (
                    <div className="account-verification" role="dialog" aria-modal="false" aria-labelledby="account-verification-title">
                      <span className="account-verification__mark" aria-hidden="true">{verificationTarget === "phone" ? "SMS" : "@"}</span>
                      <div>
                        <small>{verificationTarget === "phone" ? "Подтверждение телефона" : "Подтверждение email"}</small>
                        <h3 id="account-verification-title">Введите код</h3>
                        <p>Шестизначный код отправлен на {maskedContact}.</p>
                      </div>
                      <div className="account-verification__code">
                        <input
                          type="text"
                          name="verificationCode"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          placeholder="000000"
                          value={verificationCode}
                          onChange={(event) => { setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setVerificationError(""); }}
                          aria-label="Шестизначный код подтверждения"
                        />
                        <button type="button" onClick={confirmVerification}>Подтвердить</button>
                      </div>
                      <div className="account-verification__footer">
                        <button type="button" onClick={() => setVerificationTarget(null)}>Отмена</button>
                        <button type="button" disabled={resendSeconds > 0} onClick={() => setResendSeconds(30)}>
                          {resendSeconds > 0 ? `Новый код через 00:${String(resendSeconds).padStart(2, "0")}` : "Получить новый код"}
                        </button>
                      </div>
                    </div>
                  )}
                  {verificationError && <p className="account-verification-error" role="alert">{verificationError}</p>}
                  <label className="account-form__wide"><span>Дата рождения <small>необязательно</small></span><input type="date" name="birthday" autoComplete="bday" /></label>
                </div>
                <div className="account-form__footer"><p aria-live="polite">{savedMessage || "Подтвердите хотя бы один контакт для уведомлений о заказе."}</p><button type="submit">Сохранить изменения</button></div>
              </form>
            </section>
          )}

          {activeSection === "addresses" && (
            <section className="account-panel" aria-labelledby="account-address-title">
              <header className="account-panel__heading"><div><p className="catalog-eyebrow">Доставка</p><h2 id="account-address-title">Адреса</h2></div><p>Основной адрес будет выбран при оформлении заказа.</p></header>
              <form className="account-form" data-account-form="address" onSubmit={(event) => saveForm(event, "Адрес сохранён") }>
                <div className="account-address-label"><span>Основной адрес</span><small>СДЭК</small></div>
                <div className="account-form__grid">
                  <label><span>Город</span><input name="city" autoComplete="address-level2" placeholder="Москва" /></label>
                  <label><span>Получатель</span><input name="recipient" autoComplete="name" placeholder="Имя и фамилия" /></label>
                  <label className="account-form__wide"><span>Улица и дом</span><input name="street" autoComplete="street-address" placeholder="Улица, дом, квартира" /></label>
                  <label><span>Индекс</span><input name="postalCode" inputMode="numeric" autoComplete="postal-code" placeholder="000000" /></label>
                  <label><span>Комментарий курьеру <small>необязательно</small></span><input name="deliveryNote" placeholder="Код домофона, этаж" /></label>
                </div>
                <label className="account-check"><input type="checkbox" name="defaultAddress" defaultChecked /><span>Использовать как основной адрес</span></label>
                <div className="account-form__footer"><p>{savedMessage || "Адрес можно изменить перед каждой покупкой."}</p><button type="submit">Сохранить адрес</button></div>
              </form>
            </section>
          )}

          {activeSection === "payment" && (
            <section className="account-panel" aria-labelledby="account-payment-title">
              <header className="account-panel__heading"><div><p className="catalog-eyebrow">Оплата</p><h2 id="account-payment-title">Способ оплаты</h2></div><p>Выберите привычный способ для быстрого оформления.</p></header>
              <form className="account-payment-form" data-account-form="payment" onSubmit={(event) => saveForm(event, "Предпочтение сохранено") }>
                <div className="account-payment-options">
                  <label><input type="radio" name="paymentMethod" value="card" defaultChecked /><span className="account-payment-mark">Ю</span><span><strong>Банковская карта</strong><small>Оплата на защищённой странице ЮKassa</small></span><em>Основной</em></label>
                  <label><input type="radio" name="paymentMethod" value="sbp" /><span className="account-payment-mark account-payment-mark--sbp">СБП</span><span><strong>Система быстрых платежей</strong><small>По QR-коду или через приложение банка</small></span><em>Выбрать</em></label>
                </div>
                <div className="account-security-note"><span aria-hidden="true">✓</span><p><strong>Платёжные данные защищены</strong><small>Wood&amp;Clay не хранит реквизиты банковских карт.</small></p></div>
                <div className="account-form__footer"><p>{savedMessage || "Способ можно изменить при оформлении заказа."}</p><button type="submit">Сохранить способ</button></div>
              </form>
            </section>
          )}
        </div>
      </section>

      <section className="account-privacy-note">
        <p>Управляйте своими данными в любое время</p>
        <span>Подробнее о хранении и обработке данных — в нашей <Link href="/privacy">политике конфиденциальности</Link>.</span>
      </section>

      <CatalogFooter />
    </main>
  );
}

function pluralize(count: number) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 19) return "изделий";
  if (mod10 === 1) return "изделие";
  if (mod10 >= 2 && mod10 <= 4) return "изделия";
  return "изделий";
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return value;
  return `+${digits.slice(0, 1)} ••• •••-${digits.slice(-4, -2)}-${digits.slice(-2)}`;
}

function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  if (!domain) return value;
  return `${name.slice(0, 2)}•••@${domain}`;
}
