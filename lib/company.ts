// Single source of truth for the legal entity behind Wood&Clay — read by
// /privacy, /oferta, /vozvrat, /rekvizity, so a detail never has to be
// hand-copied across pages and drift out of sync.
export const COMPANY = {
  legalName: "ИП Лопатин Никита Тэйтович",
  inn: "971511132537",
  ogrnip: "326774600245462",
  // Correspondence address, not the ЕГРИП registration address — kept out
  // of prominent placement (see rekvizity/page.tsx) at the owner's request.
  address: "г. Москва, Березовая аллея, 17к1",
  legalPhone: "+7 966 348 03 35",
  legalPhoneHref: "tel:+79663480335",
  supportPhone: "+7 915 390-98-84",
  supportPhoneHref: "tel:+79153909884",
  supportEmail: "woodandclay.help@mail.ru",
  telegram: "https://t.me/Kiss_Love_odsk",
} as const;
