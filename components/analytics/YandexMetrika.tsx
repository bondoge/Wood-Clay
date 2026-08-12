"use client";

import { Suspense, useEffect, useRef, useSyncExternalStore } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CONSENT_CHANGE_EVENT,
  getMetrikaCounterId,
  isTrackableHost,
  readConsentCookie,
  type ConsentStatus,
} from "@/lib/consent";

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

const COUNTER_ID = getMetrikaCounterId();

function subscribeToConsentChange(callback: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
}

function getServerConsent(): ConsentStatus {
  return null;
}

// The dev-pollution host guard never changes after mount, so it's read via
// the same no-effect external-store pattern rather than useEffect+setState.
function subscribeNever() {
  return () => {};
}

function getServerTrackableHost() {
  return false;
}

export function YandexMetrika() {
  const consent = useSyncExternalStore(subscribeToConsentChange, readConsentCookie, getServerConsent);
  const trackable = useSyncExternalStore(subscribeNever, isTrackableHost, getServerTrackableHost);

  // "Soft" consent: tracking runs by default (implied by continued use, per
  // the notice in ConsentBanner) — only an explicit opt-out stops it.
  if (!COUNTER_ID || consent === "denied" || !trackable) return null;

  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

        ym(${COUNTER_ID}, "init", {
          clickmap:true,
          trackLinks:true,
          accurateTrackBounce:true,
          webvisor:true,
          ecommerce:"dataLayer"
        });`}
      </Script>
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${COUNTER_ID}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
      <Suspense fallback={null}>
        <MetrikaRouteTracker counterId={COUNTER_ID} />
      </Suspense>
    </>
  );
}

// Next's App Router navigations don't full-reload, so the snippet's
// automatic first hit (sent by ym(id,"init",...) above) never repeats on its
// own — this fires the rest by hand. usePathname/useSearchParams require a
// Suspense boundary, which YandexMetrika provides above.
function MetrikaRouteTracker({ counterId }: { counterId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    window.ym?.(Number(counterId), "hit", window.location.href);
  }, [pathname, searchParams, counterId]);

  return null;
}
