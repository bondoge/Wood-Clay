import { COMPANY } from "@/lib/company";

const BASE_URL = "https://woodclay.ru";

/**
 * Sitewide Organization markup, mounted once in app/layout.tsx. Every field
 * is sourced from lib/company.ts — the same object /rekvizity, /oferta,
 * /vozvrat, /privacy already read, so nothing here can drift out of sync
 * with what a visitor actually sees on those pages.
 *
 * Deliberately omits `address`: COMPANY.address is a correspondence address,
 * not a storefront, and lib/company.ts's own comment notes it's "kept out
 * of prominent placement at the owner's request." It's still shown as text
 * on /rekvizity (a visitor can find it), but this component is sitewide —
 * including it here would put it in every page's structured data, not just
 * the one page that shows it. Left out; revisit if that's not the intent.
 */
export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Wood&Clay",
    legalName: COMPANY.legalName,
    url: BASE_URL,
    logo: `${BASE_URL}/woodclay-mark.png`,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: COMPANY.supportPhone,
        email: COMPANY.supportEmail,
        areaServed: "RU",
        availableLanguage: "Russian",
      },
    ],
    sameAs: [COMPANY.telegram],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
