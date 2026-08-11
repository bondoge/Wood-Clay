"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
  clearYandexMetrikaCookies,
  readConsentCookie,
  writeConsentCookie,
  type ConsentStatus,
} from "@/lib/consent";

function subscribeToConsentChange(callback: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
}

function getServerConsent(): ConsentStatus {
  return null;
}

export function ConsentBanner() {
  // useSyncExternalStore (not useEffect+setState) so a returning visitor's
  // already-decided cookie is picked up before first paint, with no
  // server/client hydration mismatch and no visible banner flash.
  const status = useSyncExternalStore(subscribeToConsentChange, readConsentCookie, getServerConsent);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    const handleOpen = () => setReopened(true);
    window.addEventListener(CONSENT_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, handleOpen);
  }, []);

  const open = status === null || reopened;

  const choose = (next: "granted" | "denied") => {
    const wasGranted = status === "granted";
    writeConsentCookie(next);
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: next }));
    setReopened(false);

    if (next === "denied" && wasGranted) {
      const id = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
      if (id) clearYandexMetrikaCookies(id);
      window.location.reload();
    }
  };

  if (!open) return null;

  return (
    <div className="consent-banner" role="region" aria-label="Настройки cookie">
      <div className="consent-banner__body">
        <p className="consent-banner__title">Мы используем файлы cookie</p>
        <p>
          Технические cookie (вход в личный кабинет, корзина) необходимы для работы сайта
          и включены всегда.
          {status === "granted" && " Сейчас также включена аналитика Яндекс.Метрики."}
          {status === "denied" && " Сейчас аналитика отключена."}
        </p>
        <p>
          С вашего согласия мы также используем аналитические cookie Яндекс.Метрики, чтобы
          понимать, как посетители пользуются сайтом. Подробнее — в{" "}
          <Link href="/privacy">Политике конфиденциальности</Link>.
        </p>
      </div>
      <div className="consent-banner__actions">
        <button type="button" className="consent-banner__decline" onClick={() => choose("denied")}>
          Отклонить
        </button>
        <button type="button" className="consent-banner__accept" onClick={() => choose("granted")}>
          Принять
        </button>
      </div>
    </div>
  );
}
