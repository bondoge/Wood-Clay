// Cookie-consent state shared between ConsentBanner, YandexMetrika, and
// CookieSettingsLink. Plain functions, not "use client" — every read/write
// is guarded for SSR so this stays safe to import anywhere.

export const ANALYTICS_CONSENT_COOKIE = "wc_consent_analytics";

export type ConsentStatus = "granted" | "denied" | null;

// Dispatched on `window` whenever the visitor makes or changes a choice.
export const CONSENT_CHANGE_EVENT = "wc:consent-change";

// Dispatched by the footer's "Настройки cookie" link to reopen the banner.
export const CONSENT_OPEN_EVENT = "wc:consent-open";

export function readConsentCookie(): ConsentStatus {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${ANALYTICS_CONSENT_COOKIE}=([^;]*)`),
  );
  const value = match ? decodeURIComponent(match[1]) : null;
  return value === "granted" || value === "denied" ? value : null;
}

export function writeConsentCookie(status: "granted" | "denied") {
  const maxAgeSeconds = 180 * 24 * 60 * 60;
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${status}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax; Secure`;
}

// Метрика sets these on its own once initialized. On revoke we clear them so
// no analytics cookie survives the reload that drops the script.
export function clearYandexMetrikaCookies(counterId: string) {
  const names = ["_ym_uid", "_ym_d", "_ym_isad", `_ym_visorc_${counterId}`];
  for (const name of names) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax; Secure`;
  }
}

// Shared by YandexMetrika (base pageview tracking) and lib/ecommerce.ts
// (funnel events) so both gate on the exact same rules.

// Dev-pollution guard — never fire on localhost regardless of consent.
export function isTrackableHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

export function getMetrikaCounterId(): string | null {
  const raw = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
  // Interpolated into an inline script by YandexMetrika — restrict to
  // digits so the env var can never inject anything but a counter id.
  return raw && /^\d+$/.test(raw) ? raw : null;
}
