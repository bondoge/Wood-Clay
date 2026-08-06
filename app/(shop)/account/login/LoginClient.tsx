"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { CatalogFooter, CatalogHeader } from "../../catalog/catalog-components";

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      setSubmitting(false);
      setError("Неверный email или пароль");
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
          <h1>Вход</h1>
          <p>Заказы, адреса и сохранённая корзина — после входа они снова будут под рукой.</p>
        </div>

        <form className="account-form" onSubmit={handleSubmit}>
          <div className="account-form__grid">
            <label className="account-form__wide">
              <span>Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="account-form__wide">
              <span>Пароль</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
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
          <div className="account-form__footer">
            <p>
              Ещё нет аккаунта? <Link href="/account/register">Зарегистрироваться</Link>
            </p>
            <button type="submit" disabled={submitting}>
              {submitting ? "Входим…" : "Войти"}
            </button>
          </div>
        </form>
      </section>

      <CatalogFooter />
    </main>
  );
}
