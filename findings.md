# Task 1 — Indexing foundation: findings

Written 2026-08-21, alongside the implementation. Everything here is either a
decision made during the build (with reasoning), a coverage gap, or an item
that needs a human call — nothing in this file was fixed silently if it fell
outside what was explicitly asked.

## 1. Corrections to the original task brief

These aren't complaints about the brief — they're things I checked instead
of assuming, per the brief's own ground rules.

- **The `топ 30` column was never Cyrillic.** The real column is `is_top30`
  — plain ASCII, no space. "Топ-30" is a Directus *display translation* set
  on that field in an earlier session; the brief's framing (quoting bugs
  from a Cyrillic/spaced name) describes the Directus UI label, not the
  schema. Per the user, **no rename** — the "30" being semantically stale is
  real, but there's no technical justification left to act on, so it stays
  `is_top30` everywhere (schema, scripts, Directus).
- **~50 flagged products was stale at the time the brief was written — it's
  89 right now**, and growing via ongoing curation. Not a blocker.
- **The ТЕСТ product was worse than described.** `id=2402`, `wb_account=999`
  (a sentinel — hand-inserted, never a real WB import), title *"ТЕСТ - не
  покупать (проверка приёма платежей), 1 ₽"*, was **live and purchasable**
  (`published=true`, stock=97, price=₽1), not just a filter artifact.
  Unpublished via the Directus API.
- **There are no duplicate products — only duplicate names.** The brief's
  own example, "Статуэтки фарфор Пара собаки" (₽2800 vs ₽2600), is not a
  duplicate either, per the user — every one of these rows is a genuinely
  different physical item that happens to share a title. Section 5 below is
  the resulting inventory, reframed accordingly: a naming worklist for Task
  3, not a merge candidate list. Nothing was merged, unpublished, or
  renamed.
- **Dimension/weight coverage is already excellent** — see section 3.
- **LCP is currently passing** — see section 6. The thing actually worth
  fixing turned out to be bandwidth waste, not the LCP metric itself.

## 2. Structured data — what's covered and what isn't

**Sitewide** (`components/seo/OrganizationJsonLd.tsx`, mounted in
`app/layout.tsx`): `Organization` with `name`, `legalName`, `url`, `logo`,
one `ContactPoint` (support phone + email), `sameAs: [Telegram]`. Every
field reads `lib/company.ts`'s `COMPANY` object — the same source
`/rekvizity`, `/oferta`, `/vozvrat`, `/privacy` already read.

**Deliberately omitted `address`.** `COMPANY.address` is shown as text on
`/rekvizity` (labeled "Адрес для корреспонденции"), so it satisfies "only
mark up what's visible" if included — but `lib/company.ts`'s own comment
notes it's *"kept out of prominent placement at the owner's request."*
`OrganizationJsonLd` is sitewide, so including it would put the address in
every page's structured data, not just the one page that shows it. Left
out. **This is a judgment call, not a rule — say if you want it included.**

**Product pages** (`components/seo/ProductJsonLd.tsx`): `Product` + `Offer`.
`name`/`description`/`image` all read `own_title`/`own_description`/
`own_images` — the exact columns the visible page renders, so they can't
drift. `sku` = `wb_article`. `offers.availability` is derived from real
`stock` (`InStock`/`OutOfStock`), never asserted. `width`/`height`/`depth`/
`weight` (mapped from `width_cm`/`height_cm`/`length_cm`/`weight_g` — schema.org
has no "length" property on `Product`, so `length_cm` maps to `depth`)
included only when the DB value is non-null.

- **No `material` field exists in the schema.** "Фарфор" is hardcoded JSX on
  the product page itself (`app/(shop)/catalog/[slug]/page.tsx`), not a
  per-product column — every product sold today is porcelain, so this isn't
  incorrect, just not sourced from real per-row data. If a non-porcelain
  product is ever added, this hardcoded value needs to become a real column
  first.
- **No rating/review markup anywhere.** No product page shows a rating —
  the site's only rating-shaped UI (a static 5-star `Stars()` component) is
  on the homepage's review carousel, always renders 5/5 regardless of the
  actual review, and isn't tied to per-review numeric data. Marking that up
  as an `AggregateRating` would be exactly the kind of unsubstantiated claim
  the brief warns against sanctioning. Not built.

**Product + `/korporativnye-podarki`** (`components/seo/BreadcrumbJsonLd.tsx`):
matches the *visible* breadcrumb trail exactly. The product page's own
breadcrumb is two levels (Каталог → category) with no "Главная" crumb — the
JSON-LD doesn't invent one either. **`/catalog` has no visible breadcrumb UI
at all**, so it gets no `BreadcrumbList` — nothing to match.

**`/catalog`** (`components/seo/ItemListJsonLd.tsx`): scoped to the first 24
products (`PAGE_SIZE` in `catalog-constants.ts`) — the same batch
`CatalogClient` actually renders before any interaction (its default sort
preserves array order, confirmed by reading the sort fallback). Originally
built against the *full* ~780-product list; reverted after measuring it at
210KB of inline JSON for marginal benefit over the visible batch.

**`/korporativnye-podarki`** also gets `FAQPage`
(`components/seo/FAQJsonLd.tsx`) — 4 real questions or price/tirage/
lead-time, written to match copy actually rendered on the page, not invented
to have something to mark up.

**Not built:** category/collection-page `ItemList` usage — those routes
don't exist yet (Task 2). The component is ready for them.

## 3. Dimension/weight coverage

777 of 778 published products have `length_cm`/`width_cm`/`height_cm`; 761
of 778 have `weight_g` (backfilled in an earlier session). This was already
close to complete before this task — nothing to fix here.

## 4. `lastModified` — omitted everywhere, and why

There is no `updated_at` column on `products`. `imported_at` exists but only
reflects when a row was last synced from Wildberries — a price change,
style correction, or publish toggle in Directus doesn't touch it. Using it
as `lastModified` would misstate freshness for any product curated after
its original import (which is most of them, and matters more the older a
row gets). Static pages have no per-page timestamp at all.

**Recommendation:** add a real `updated_at timestamp` column to `products`
(Drizzle's `.$onUpdate(() => new Date())` or a Postgres trigger), so this
signal can actually be turned on later. Didn't do this now — it's a schema
change beyond what this task asked for, and deserves its own review rather
than riding in on a sitemap fix.

## 5. Same-title inventory — for Task 3, not a merge plan

109 titles are shared by more than one published product (348 rows — **45%
of the 777 published catalogue**). Per the user, none of these are actual
duplicate listings — each row is a genuinely different item (pose, color,
size) that happens to share a name. This is a naming problem, and per the
task brief the actual fix (writing disambiguated names/descriptions) belongs
to Task 3's product-description rewrite, not here. This table is that
task's starting worklist.

Two already-known real cases for calibration: "Заколка для волос ручная
роспись" (7 rows, all ₽640) and "Заколка для волос ручная авторская
роспись." (6 rows, all ₽640) are real color variants — the precedent given
was to add the color to the name, e.g. "Заколка для волос ручная роспись,
[цвет]".

| Название | Товаров | Цена | Остаток (сумма) |
|---|---|---|---|
| Статуэтка фарфор Ангел для интерьера | 15 | 5200 ₽ | 79 |
| Фарфоровая статуэтка Русская псовая борзая | 11 | 6000–6400 ₽ | 33 |
| Фигурка статуэтка Гжель Коза символ года 2027 | 11 | 520–2400 ₽ | 419 |
| Заколка для волос ручная роспись | 7 | 640 ₽ | 29 |
| Мишка олимпийский Болельщик фарфоровый СССР | 7 | 4400–4480 ₽ | 10 |
| Елочная игрушка Конфета. Фарфор, ручная роспись | 6 | 1200 ₽ | 43 |
| Елочная игрушка майолика, ручная роспись | 6 | 960–1280 ₽ | 174 |
| Елочная игрушка фарфор Котенок. Колокол Котик | 6 | 1600–1760 ₽ | 46 |
| Заколка для волос ручная авторская роспись. | 6 | 640 ₽ | 70 |
| Пасхальное яйцо Жостово Набор 3 штуки | 6 | 2160 ₽ | 101 |
| Статуэтка фарфоровая Лошадка. Символ года 2026 | 6 | 600–1040 ₽ | 144 |
| Фарфоровая уникальная статуэтка Коза пряник | 6 | 920–1920 ₽ | 102 |
| Колокольчик Котик фарфор, украшение на елку | 5 | 1440–1920 ₽ | 50 |
| Мишка олимпийский Лыжник фарфоровый СССР | 5 | 3600–4800 ₽ | 12 |
| Мишка олимпийский Футбол фарфоровый СССР | 5 | 4320–4400 ₽ | 7 |
| Пасхальное яйцо Жостово роспись | 5 | 1120 ₽ | 14 |
| Подсвечник фарфоровый Гжель 1 шт | 5 | 560–720 ₽ | 54 |
| Статуэтка фарфоровая гжель Коза Символ года | 5 | 680–880 ₽ | 248 |
| Фарфоровая фигурка Символ года 2026 Лошадка | 5 | 616–1000 ₽ | 216 |
| Елочная игрушка фарфоровая Змея Хохлома | 4 | 880–1120 ₽ | 140 |
| Елочный шар дерево. Ручная роспись | 4 | 960–1280 ₽ | 9 |
| Колокольчик Ангел фарфор, украшение на елку | 4 | 1680–2080 ₽ | 41 |
| Колокольчик Зайка фарфор, украшение на елку | 4 | 1680–1760 ₽ | 34 |
| Мишка олимпийский Хоккей фарфоровый СССР | 4 | 4640–5200 ₽ | 8 |
| Статуэтка фарфор Ангел хранитель | 4 | 5200 ₽ | 8 |
| Статуэтка фарфор Лошадь. Символ года 2026 | 4 | 1040–1440 ₽ | 56 |
| Статуэтка фарфор собака Чихуахуа | 4 | 3040 ₽ | 11 |
| Статуэтка фарфоровая Лошадка символ года | 4 | 1360–2800 ₽ | 74 |
| Статуэтка фарфоровая интерьерная Баран символ года 2027 | 4 | 1320–4000 ₽ | 29 |
| Фигурка Олимпийский мишка. СССР | 4 | 4320 ₽ | 8 |
| Фигурка фарфор Шнауцер, 8 см. | 4 | 1120 ₽ | 21 |
| Деревянное пасхальное яйцо. Курочка | 3 | 800–1040 ₽ | 82 |
| Елочная игрушка фарфоровая Змея | 3 | 1200 ₽ | 95 |
| Колокольчик Домовой фарфор, украшение на елку | 3 | 1600–2120 ₽ | 22 |
| Мишка олимпийский Доктор фарфоровый СССР | 3 | 4320 ₽ | 4 |
| Мишка олимпийский Я русский фарфоровый СССР | 3 | 4320–4400 ₽ | 6 |
| Мишка олимпийский боксер фарфоровый СССР | 3 | 4320–4400 ₽ | 4 |
| Набор деревянных ёлочных украшений | 3 | 1280–1360 ₽ | 41 |
| Статуэтка кошка фарфоровая роспись Хохлома | 3 | 1840–2000 ₽ | 44 |
| Статуэтка фарфор кошка Мейнкун | 3 | 3040 ₽ | 3 |
| Статуэтка фарфоровая Коза символ года 2027 | 3 | 2400 ₽ | 19 |
| Фарфоровая фигурка Кот Пушок | 3 | 960 ₽ | 48 |
| Фигурка Шотландская вислоухая кошка | 3 | 2160–2800 ₽ | 9 |
| Фигурка миниатюрная фарфор Персидский кот | 3 | 1360–1520 ₽ | 12 |
| Фигурка на елку Гжель Коза символ года 2027 | 3 | 720–920 ₽ | 228 |
| Фигурка на елку Коза символ года 2027 | 3 | 1760 ₽ | 57 |
| Фигурка фарфоровая Бультерьер. Статуэтка для интерьера. | 3 | 912–920 ₽ | 11 |
| Ёлочная игрушка Избушка на Курьих ножках фарфоровая | 2 | 2880–4480 ₽ | 37 |
| Ёлочная игрушка Лошадка символ 2026 фарфоровая | 2 | 1600–2640 ₽ | 24 |
| Ёлочная игрушка Лошадка символ года 2026 | 2 | 2560–4000 ₽ | 9 |
| Елочная игрушка Дракон. Фарфор, ручная роспись | 2 | 1600–1680 ₽ | 13 |
| Елочная игрушка Коза. Фарфор, Хохлома | 2 | 1440–1760 ₽ | 64 |
| Елочная игрушка керамика. Дети СССР. Майолика | 2 | 1440–1600 ₽ | 17 |
| Елочная игрушка колокольчик фарфор Змея | 2 | 1120 ₽ | 74 |
| Елочная игрушка лошадка, Хохлома | 2 | 1440 ₽ | 47 |
| Елочная игрушка майолика Сова, ручная роспись | 2 | 1040–1200 ₽ | 32 |
| Елочная игрушка фарфоровая Мальчик | 2 | 1760–3200 ₽ | 4 |
| Елочная игрушка фарфоровая Царевна Лягушка | 2 | 1760–2400 ₽ | 31 |
| Елочная игрушка фарфоровая Чеширский кот | 2 | 1680–2960 ₽ | 59 |
| Елочная фарфоровая игрушка Снеговик | 2 | 1920 ₽ | 39 |
| Елочное украшение шар Змея символ года | 2 | 1200 ₽ | 36 |
| Змея фарфоровая для росписи. Елочная игрушка. Символ года. | 2 | 560–800 ₽ | 48 |
| Коллекционный Олимпийский мишка Дед мороз | 2 | 4080 ₽ | 15 |
| Колокольчик керамика Жираф. Статуэтка | 2 | 1440 ₽ | 23 |
| Матрешка Семья Петух курочка цыпленок | 2 | 4000–4560 ₽ | 5 |
| Мишка олимпийский Рыбак фарфоровый СССР | 2 | 4480 ₽ | 2 |
| Мишка олимпийский байкер фарфоровый СССР | 2 | 7600–8000 ₽ | 2 |
| Мишка олимпийский болельщик фарфоровый СССР | 2 | 4480 ₽ | 2 |
| Статуэтка Баба Яга с ручной росписью | 2 | 1360–1440 ₽ | 27 |
| Статуэтка Черепаха фарфоровая роспись Хохлома | 2 | 1600–1840 ₽ | 32 |
| Статуэтка для интерьера фарфоровая Голубь | 2 | 1520 ₽ | 8 |
| Статуэтка из фарфора Лабрадор | 2 | 2800 ₽ | 5 |
| Статуэтка фарфор Баба Яга. Ручная роспись. | 2 | 1760 ₽ | 17 |
| Статуэтка фарфор Баба Яга. Фигурка Гжель. | 2 | 1160–1600 ₽ | 17 |
| Статуэтка фарфор Бык. Фигурка фарфоровая | 2 | 2640 ₽ | 10 |
| Статуэтка фарфор Короткошерстная кошка | 2 | 2800 ₽ | 18 |
| Статуэтка фарфор Кошка | 2 | 880–1280 ₽ | 2 |
| Статуэтка фарфор Лиса. Фигурка фарфоровая | 2 | 2560–4000 ₽ | 20 |
| Статуэтка фарфор Лошадь с гитарой | 2 | 1120 ₽ | 13 |
| Статуэтка фарфор кошка Вислоухая | 2 | 2640–3200 ₽ | 7 |
| Статуэтка фарфор собака Такса | 2 | 1680 ₽ | 5 |
| Статуэтка фарфор собака Цвергшнауцер. Фигурка фарфоровая | 2 | 2400 ₽ | 13 |
| Статуэтка фарфоровая Дед Мороз | 2 | 1600–2640 ₽ | 98 |
| Статуэтка фарфоровая Пасхальный Кролик | 2 | 3200–3360 ₽ | 7 |
| Статуэтка фарфоровая Снегурочка. Фигурка под елку. | 2 | 2400–2640 ₽ | 4 |
| Статуэтка фарфоровая гжель Гусь | 2 | 960 ₽ | 27 |
| Статуэтка фарфоровая гжель Петух | 2 | 960–1040 ₽ | 34 |
| Статуэтка фарфоровая гжель Утка | 2 | 960 ₽ | 21 |
| Статуэтки фарфор Пара кот и кошка. | 2 | 2400 ₽ | 33 |
| Статуэтки фарфор Пара собаки | 2 | 2600–2800 ₽ | 20 |
| Украшение на Елку Лошадка-Неваляшка | 2 | 880 ₽ | 30 |
| Украшение на елку майолика Снеговик | 2 | 1440 ₽ | 29 |
| Фарфоровое Украшение на Елку Лошадка | 2 | 960–1200 ₽ | 51 |
| Фигурка Ориентальная кошка | 2 | 2800 ₽ | 4 |
| Фигурка миниатюрная Гжель Баран символ года 2027 | 2 | 480–520 ₽ | 58 |
| Фигурка на елку Овечка символ года 2027 | 2 | 1760–2400 ₽ | 5 |
| Фигурка на елку Самолет, майолика | 2 | 1600–1920 ₽ | 46 |
| Фигурка на елку Снеговик, майолика | 2 | 1600 ₽ | 17 |
| Фигурка статуэтка Гжель Кот Добряк | 2 | 1120–1600 ₽ | 23 |
| Фигурка статуэтка фарфоровая Гжель Пара кот и кошка | 2 | 1600–2160 ₽ | 4 |
| Фигурка статуэтка фарфоровая Гжель Рыба | 2 | 680–960 ₽ | 27 |
| Фигурка статуэтка фарфоровая Гжель Свинья | 2 | 600–760 ₽ | 31 |
| Фигурка фарфор Шнауцер, статуэтка | 2 | 2800 ₽ | 3 |
| Фигурка фарфор кошка Сиамская. Статуэтка 10.5 х 6 см | 2 | 720–920 ₽ | 9 |
| Фигурка фарфор собака Йорк. | 2 | 1120 ₽ | 20 |
| Фигурка фарфор собака Пудель. | 2 | 920 ₽ | 5 |
| Фигурка фарфор собака Скотч терьер. | 2 | 720–912 ₽ | 34 |
| Фигурка фарфоровая Кролик роспись Жостово | 2 | 2400 ₽ | 7 |
| Фигурка фарфоровая Утка | 2 | 760–800 ₽ | 23 |

*(fresh query at time of writing — re-run before Task 3 starts, since
Directus curation is ongoing and this will drift)*

## 6. Homepage LCP — measured, not guessed

Measured with Playwright + Chrome DevTools Protocol, Fast-3G-ish throttle
(1.6Mbps down, 150ms latency) + 4× CPU slowdown, matching the CLAUDE.md
budget's stated conditions.

- **LCP element: the hero `<video>`'s poster frame**, painting at **2.27s**
  (budget: 2.5s) — currently passing, with the poster-preload the brief
  asked me to confirm actually real (`poster="/hero-poster.jpg"`, 47KB JPG).
- **Real problem found instead:** the hero MP4
  (`hero_video/hero_video_3.mp4`) is **14.6MB**, and on the same throttled
  load the browser issued **two separate ~14.6MB range requests** for it —
  real mobile-data cost that doesn't block LCP today but eats into the
  margin and competes for bandwidth with everything else on the page.
- **Fixed:** added `<link rel="preload" as="image" fetchPriority="high">`
  for the poster in `app/page.tsx` (guarantees the browser starts fetching
  it before it reaches the `<video poster>` attribute mid-parse, tightening
  the 2.27s margin further). Tried adding `fetchPriority="low"` to the
  `<video>` tag itself too, to deprioritize its own fetch relative to
  LCP-critical requests — reverted, `fetchPriority` isn't in this React
  version's typed `VideoHTMLAttributes`, and it wasn't worth an `any`-cast
  for a secondary optimization.
- **Not fixed, recommended:** re-encode the hero video at a lower bitrate
  and/or shorter loop. 14.6MB is large for a background loop; even a
  50–70% reduction (achievable with `ffmpeg -crf 28` or similar, without a
  visible quality change on a small autoplaying background element) would
  meaningfully cut mobile data cost. Didn't do this — I can't produce a new
  video asset, only re-encode what exists, and that's a judgment call about
  acceptable quality loss that should be made by whoever can actually watch
  the result.
- **Also noticed, not fixed:** the homepage's review-grid images
  (`reviews/grid-600/IMG_2371.webp`, `IMG_2420.webp`, `IMG_2421.webp`)
  404 against the Selectel bucket — unrelated to this task, pre-existing,
  worth someone's attention separately.

## 7. Fixed along the way (small, safe, directly in scope)

- **Duplicate `<h1>` on the homepage.** `app/HomeClient.tsx`'s reviews
  section had its own `<h1 id="reviews-heading">Нам доверяют</h1>` — a
  second H1 on a page that already has one (the hero heading). Changed to
  `<h2>`; had to also retarget two CSS rules from the bare-tag selector
  `.reviews h1` to `.reviews #reviews-heading` (the section has an
  *unrelated* `<h2>` too — the reviewer's name in the spotlight card — so a
  blanket `.reviews h2` selector would have picked that up as well).
- **Header/footer link fixes**, both headers/footers (homepage +
  `CatalogHeader`/`CatalogFooter`): "О нас" and "На заказ"/"Корпоративным
  клиентам" now point at the real `/o-nas` and `/korporativnye-podarki`
  pages instead of `#about`/`#custom` anchors. Also fixed a pre-existing bug
  where the homepage header's "Контакты" link pointed at `#custom` (the
  same target as "На заказ" — a copy-paste bug, not intentional) — now
  points at the new `/kontakty`.
- **"Instagram скоро" removed** from both footers (and its now-orphaned CSS
  rule), Telegram link untouched.
- **ТЕСТ product unpublished** (see §1).

## 8. Architecture notes (not findings, but explain the diff)

- **`/o-nas`, `/kontakty`, `/korporativnye-podarki` live under the `(shop)`
  route group**, not as siblings of the plain legal pages (`/oferta` etc).
  They use `CatalogHeader`/`CatalogFooter` (cart icon, account link) rather
  than the legal pages' plain nav — a deliberate choice, since these are
  marketing/commercial pages, not compliance boilerplate, and the "highest
  commercial priority" corporate page in particular should keep the cart
  visible. This means they're dynamically rendered (`ƒ`, not statically
  prerendered) — same as `/catalog` and every product page already are, for
  the same reason (session/cart state).
- **The bulk-order inquiry form was extracted** from `HomeClient.tsx` into
  `app/(shop)/korporativnye-podarki/CorporateInquiryForm.tsx`, a shared
  component now mounted on both the homepage's `#custom` section and the
  new corporate page — one implementation instead of two copies of the same
  stateful form logic.
- **`app/(shop)/catalog/catalog-constants.ts`** is a new, deliberately
  plain (non-`"use client"`) module holding `PAGE_SIZE`. It has to exist
  separately from `CatalogClient.tsx` — a plain constant exported from a
  `"use client"` file resolves to an opaque client-reference stub, not its
  real value, when imported into a server component. Cost some debugging
  time to find; saved as a memory for next time.

## 9. Definition-of-done status

- [x] `robots.txt` and `sitemap.xml` return valid responses (verified
      locally against real DB data; production verification after deploy).
- [x] Sitemap contains every in-stock published product (`listPublishedInStock`).
- [ ] Structured data validated in Yandex Webmaster — **needs your account**
      (see below).
- [x] О нас, Контакты, corporate page live, linked from both nav variants
      and both footers, each with a unique title/H1/meta description.
- [x] This file.

## What needs you

- **Yandex Webmaster**: validate structured data, submit the sitemap, and
  request reindexing of the homepage and `/catalog` — all need the
  authenticated account, per the task brief.
- **Whether `COMPANY.address` should be added to the sitewide Organization
  markup** (§2) — currently omitted on purpose.
- **Whether `/rekvizity` should fold into `/kontakty`** — the new page is
  deeper; `/rekvizity` still exists standalone and both are linked from
  every footer. Not resolved either way; both work fine as-is.
- **Hero video re-encode** (§6) — a real bandwidth-cost recommendation, not
  something I can execute without producing a new asset myself.
- **The same-title inventory (§5)** is Task 3's starting point, not a
  decision for now.
