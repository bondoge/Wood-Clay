"use client";

import { CONSENT_OPEN_EVENT } from "@/lib/consent";

export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
    >
      Настройки cookie
    </button>
  );
}
