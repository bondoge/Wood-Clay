"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { CatalogFooter, CatalogHeader } from "../../catalog/catalog-components";

const START_ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Введите корректный email.",
  too_many_requests: "Слишком много попыток. Попробуйте позже.",
};

const CONFIRM_ERROR_MESSAGES: Record<string, string> = {
  invalid_input: "Проверьте правильность заполнения формы — пароль должен содержать не менее 8 символов.",
  invalid_code: "Неверный или истёкший код. Проверьте письмо или запросите новый.",
  too_many_requests: "Слишком много попыток. Попробуйте позже.",
};

export default function ForgotPasswordClient() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const requestCode = async () => {
    const response = await fetch("/api/account/password-reset/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);

    if (!response?.ok) {
      const body = await response?.json().catch(() => null);
      setError(START_ERROR_MESSAGES[body?.error] ?? "Не удалось отправить код. Попробуйте ещё раз.");
      return false;
    }
    return true;
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const ok = await requestCode();
    setSubmitting(false);
    if (!ok) return;

    setStep("code");
    setResendSeconds(30);
  };

  const handleResend = async () => {
    setError("");
    setResendSeconds(30);
    await requestCode();
  };

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(code)) {
      setError("Введите шестизначный код");
      return;
    }
    if (newPassword !== newPassword2) {
      setError("Пароли не совпадают");
      return;
    }

    setSubmitting(true);

    const response = await fetch("/api/account/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    }).catch(() => null);

    if (!response?.ok) {
      const body = await response?.json().catch(() => null);
      setSubmitting(false);
      setError(CONFIRM_ERROR_MESSAGES[body?.error] ?? "Что-то пошло не так. Попробуйте ещё раз.");
      return;
    }

    const result = await signIn("credentials", { email, password: newPassword, redirect: false });
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
          <h1>Восстановление пароля</h1>
          <p>
            {step === "email"
              ? "Укажите email, привязанный к аккаунту — мы отправим код для сброса пароля."
              : "Введите код из письма и придумайте новый пароль."}
          </p>
        </div>

        {step === "email" ? (
          <form className="account-form" onSubmit={handleEmailSubmit}>
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
              {error && (
                <p className="account-verification-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="account-form__footer">
              <p>
                Вспомнили пароль? <Link href="/account/login">Войти</Link>
              </p>
              <button type="submit" disabled={submitting}>
                {submitting ? "Отправляем…" : "Отправить код"}
              </button>
            </div>
          </form>
        ) : (
          <form className="account-form" onSubmit={handleResetSubmit}>
            <div className="account-form__grid">
              <div className="account-verification">
                <span className="account-verification__mark" aria-hidden="true">@</span>
                <div>
                  <small>Код отправлен</small>
                  <h3>Введите код</h3>
                  <p>Шестизначный код отправлен на {email}.</p>
                </div>
                <div className="account-verification__code">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                    aria-label="Шестизначный код подтверждения"
                  />
                </div>
                <div className="account-verification__footer">
                  <button type="button" onClick={() => setStep("email")}>Изменить email</button>
                  <button type="button" disabled={resendSeconds > 0} onClick={() => void handleResend()}>
                    {resendSeconds > 0 ? `Новый код через 00:${String(resendSeconds).padStart(2, "0")}` : "Получить новый код"}
                  </button>
                </div>
              </div>
              <label className="account-form__wide">
                <span>Новый пароль <small>не менее 8 символов</small></span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
              <label className="account-form__wide">
                <span>Повторите новый пароль</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={newPassword2}
                  onChange={(event) => setNewPassword2(event.target.value)}
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
                Вспомнили пароль? <Link href="/account/login">Войти</Link>
              </p>
              <button type="submit" disabled={submitting}>
                {submitting ? "Сохраняем…" : "Сохранить пароль"}
              </button>
            </div>
          </form>
        )}
      </section>

      <CatalogFooter />
    </main>
  );
}
