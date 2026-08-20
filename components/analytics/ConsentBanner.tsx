"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

// "Soft" consent: analytics runs by default (implied by continued use, per
// the notice's own text) unless a visitor explicitly opts out. The notice
// itself is informational, not a gate — it auto-dismisses on its own.
const AUTO_DISMISS_MS = 6000;

export function ConsentBanner() {
  // useSyncExternalStore (not useEffect+setState) so a returning visitor's
  // already-decided cookie is picked up before first paint, with no
  // server/client hydration mismatch and no visible notice flash.
  const status = useSyncExternalStore(subscribeToConsentChange, readConsentCookie, getServerConsent);
  const [reopened, setReopened] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleOpen = () => setReopened(true);
    window.addEventListener(CONSENT_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, handleOpen);
  }, []);

  // Only the very first, unprompted showing auto-dismisses. A visitor who
  // deliberately reopens it via the footer link is making a choice, not
  // passively seeing a notice, so it shouldn't vanish on them mid-read.
  const firstVisit = status === null && !reopened;
  const open = status === null || reopened;

  const choose = (next: "granted" | "denied") => {
    const wasTracking = status !== "denied";
    if (timerRef.current) clearTimeout(timerRef.current);
    writeConsentCookie(next);
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: next }));
    setReopened(false);

    if (next === "denied" && wasTracking) {
      const id = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
      if (id) clearYandexMetrikaCookies(id);
      window.location.reload();
    }
  };

  useEffect(() => {
    if (!firstVisit) return;
    timerRef.current = setTimeout(() => choose("granted"), AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // choose() only depends on `status`, which is null throughout this
    // effect's lifetime (firstVisit requires status === null) — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstVisit]);

  if (!open) return null;

  return (
    <div className="consent-notice" role="region" aria-label="Уведомление об использовании cookie">
      <p>
        Мы используем cookie, включая аналитические (Яндекс.Метрика). Продолжая пользоваться
        сайтом, вы соглашаетесь с их использованием. <Link href="/privacy">Подробнее</Link>.
      </p>
      {/* Only a deliberately reopened visit (via the footer's "Настройки
          cookie" link) gets the enable/disable control — the unprompted
          first-visit notice is purely informational, control lives in the
          footer. */}
      {!firstVisit && (
        <div className="consent-notice__actions">
          {status === "denied" ? (
            <button type="button" onClick={() => choose("granted")}>
              Включить аналитику
            </button>
          ) : (
            <button type="button" onClick={() => choose("denied")}>
              Отключить аналитику
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        className="consent-notice__close"
        aria-label="Закрыть уведомление"
        onClick={() => choose(status === "denied" ? "denied" : "granted")}
      >
        ×
      </button>
    </div>
  );
}
