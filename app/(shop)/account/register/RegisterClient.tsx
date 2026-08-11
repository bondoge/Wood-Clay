"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { CatalogFooter, CatalogHeader } from "../../catalog/catalog-components";
import { formatRuPhoneInput } from "@/lib/phone";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Проверьте правильность заполнения формы — пароль должен содержать не менее 8 символов.",
  email_taken: "Этот email уже зарегистрирован. Попробуйте войти.",
  too_many_requests: "Слишком много попыток. Попробуйте позже.",
};

export default function RegisterClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const response = await fetch("/api/account/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        consent,
      }),
    }).catch(() => null);

    if (!response || !response.ok) {
      const body = await response?.json().catch(() => null);
      setSubmitting(false);
      setError(ERROR_MESSAGES[body?.error] ?? "Что-то пошло не так. Попробуйте ещё раз.");
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setSubmitting(false);
      router.push("/account/login");
      return;
    }

    router.push("/account");
    router.refresh();
  };

  return (
    <main className="catalog-page account-page">
      <CatalogHeader current="account" />

      <section className="account-auth">
        <div className="account-auth__intro">
          <p className="catalog-eyebrow">Личный кабинет</p>
          <h1>Регистрация</h1>
          <p>Аккаунт нужен, чтобы сохранять адреса, отслеживать заказы и не заполнять данные заново.</p>
        </div>

        <form className="account-form" onSubmit={handleSubmit}>
          <div className="account-form__grid">
            <label>
              <span>Имя</span>
              <input
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </label>
            <label>
              <span>Фамилия</span>
              <input
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </label>
            <label className="account-form__wide">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="account-form__wide">
              <span>Телефон <small>необязательно</small></span>
              <input
                type="tel"
                autoComplete="tel"
                placeholder="+7 900 000-00-00"
                value={phone}
                onChange={(event) => setPhone(formatRuPhoneInput(event.target.value))}
              />
            </label>
            <label className="account-form__wide">
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
            {error && (
              <p className="account-verification-error" role="alert">
                {error}
              </p>
            )}
          </div>

          <label className="account-check">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              Согласен(на) с <Link href="/privacy">политикой конфиденциальности</Link> и обработкой персональных данных
            </span>
          </label>

          <div className="account-form__footer">
            <p>
              Уже есть аккаунт? <Link href="/account/login">Войти</Link>
            </p>
            <button type="submit" disabled={submitting}>
              {submitting ? "Создаём…" : "Зарегистрироваться"}
            </button>
          </div>
        </form>
      </section>

      <CatalogFooter />
    </main>
  );
}
