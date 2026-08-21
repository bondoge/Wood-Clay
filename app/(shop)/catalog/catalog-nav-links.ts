// Its own plain module, not exported from catalog-components.tsx — that
// file is "use client", and a plain constant re-exported from a "use
// client" file resolves to an opaque client-reference stub (not its real
// value) when imported into a server component. Same reasoning as
// catalog-constants.ts's PAGE_SIZE. Found the hard way: novogodnie-podarki-
// 2027/page.tsx (a server component) 500'd with "NAV_LINKS.map is not a
// function" the first time this lived in catalog-components.tsx.
//
// Shared across every header/mobile-nav render site (CatalogHeader's
// desktop nav + its MobileNavToggle, HomeClient's own equivalents, and
// novogodnie-podarki-2027's embedded transparent nav) so a new link only
// ever needs adding once — hand-duplicating this list is exactly what
// caused the "Контакты" link pointing at the wrong anchor on the home page
// (found and fixed in Task 1). Each caller still supplies "Главная"
// itself, since its href differs (home page's own header uses "#top",
// everywhere else uses "/").
export const NAV_LINKS = [
  { href: "/novogodnie-podarki-2027", label: "Новогодние подарки 2027" },
  { href: "/o-nas", label: "О нас" },
  { href: "/korporativnye-podarki", label: "Корпоративным клиентам" },
  { href: "/kontakty", label: "Контакты" },
];
