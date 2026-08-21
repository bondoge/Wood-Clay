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
- **Fixed 2026-08-21 (during Task 2), on request:** re-encoded the hero
  video. Original was `hero_video/hero_video_3.mp4` — 852×480, 30fps, H.264
  at ~3.9 Mbps video + a 192 kbps AAC audio track the `<video>` element can
  never play (it's always `muted`), 14.6MB total for 28.2s. Re-encoded with
  `ffmpeg -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags
  +faststart` (audio stripped entirely, same resolution/frame rate/duration
  kept — the original bitrate was excessive for the resolution, not the
  resolution itself) → **2.35MB, an 84% reduction**. Compared frames from
  the original against CRF 26 and CRF 28 side by side; both were visually
  indistinguishable from the original, picked CRF 26 for the extra quality
  margin at a ~500KB cost. Uploaded to the same Selectel bucket as
  `hero_video/hero_video_3-optimized.mp4` — a **new key, not an overwrite**
  of the original: that file is what the currently-deployed production
  homepage actually serves, and overwriting a live asset outside the normal
  git-based deploy flow would have changed production immediately, with no
  easy rollback. `HomeClient.tsx` and `novogodnie-podarki-2027/page.tsx`
  both now point at the new file; the old one is left in place untouched
  (harmless, just unused once this deploys) rather than deleted.
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

---

# Task 2 — Catalog routing and landing pages: findings

Written 2026-08-21, alongside the implementation. Full reasoning for each
decision lives in the approved plan (`crystalline-churning-pudding.md`); this
is the record of what actually shipped and what was found along the way.

## 1. URL structure

Decided: **no product URL migration.** Product URLs stay `/catalog/{slug}`
exactly as before. New category/style pages resolve at the same
`/catalog/{slug}` depth via lookup precedence inside the existing
`app/(shop)/catalog/[slug]/page.tsx` (category registry → style registry →
`simvol-goda-{year}` pattern → product `bySlug()` fallback → 404).
Category×style intersections get a new nested route,
`app/(shop)/catalog/[slug]/[styleSlug]/page.tsx` — reusing the `[slug]`
segment name (Next.js requires a shared dynamic-segment name at one
directory depth), which is a URL shape (`/catalog/{a}/{b}`) that had no
prior meaning, so it's purely additive.

Guarded permanently: `scripts/import-new-wb-products.mjs`'s slug generator
now checks a `RESERVED_CATALOG_SLUGS` set + `simvol-goda-\d{4}` pattern
(hand-ported from `lib/catalog-taxonomy.ts`'s `isReservedCatalogSlug`, since
that script is plain `.mjs` with no TS import support — same trade-off
already accepted for its `TRANSLIT` table) before accepting a generated
slug; on collision it falls back to the same `-{wbArticle}` suffix the
script already uses for ordinary slug collisions. Verified in isolation
(the full script needs live WB API credentials, which this session doesn't
have) — a standalone copy of the guard function correctly flags `"gzhel"`,
`"elochnye-igrushki"`, and `"simvol-goda-2027"` as reserved, and correctly
passes through `"simvol-goda-99"` (wrong digit count) and real-shaped
product slugs untouched.

## 2. Taxonomy — one registry, the "Ёлочные игрушки" fix

`lib/catalog-taxonomy.ts` is now the single source for category/style
identity. `app/(shop)/catalog/collections.ts` (the client-side filter/tile
logic) was refactored to source `STYLE_LABELS`/`FEATURED_CATEGORY_LABELS`/
`matchesCategory` from it instead of keeping its own copy — this is the
actual fix for "filters say Ёлочные игрушки, product pages say Елочные
украшения": the raw DB `product_type` ("Елочные украшения", WB-synced,
untouched) is no longer shown to a user anywhere — every display site
(sidebar filter, category page, product breadcrumb, product detail
"Категория" fact) now reads the registry's canonical label
("Ёлочные игрушки" — matches the brief's own named target query and has
materially higher search volume).

8 categories, 3 styles, 6 intersections (see plan §2 for the eligibility
rule and exact crosstab counts) — all live and linked. The `matchesCategory`
"year-symbol" tile (the featured homepage/catalog tile, distinct from the
8 real category routes) still uses a hardcoded `title.includes("коза")`
check for now, with a `TODO(Task 2 Phase 5)` comment — switching it to read
`symbolYear` needs `symbolYear` added to `ProductView` first, which wasn't
otherwise needed by anything shipped this task (the new symbol-year routes
query the DB directly via `bySymbolYear()`, not through `ProductView`). Left
as a flagged follow-up rather than adding an unused field — see "What needs
you" below.

## 3. Category/style/intersection pages

All hand-written per the brief's "no templated text" rule — copy lives in
`app/(shop)/catalog/category-copy.ts` (11 entries), `intersection-copy.ts`
(6 entries), `symbol-year-copy.ts` (8 entries, one per zodiac year, so a
future year needs no code change — see §4). Every page reuses
`CatalogClient` wholesale (search/filter/sort/pagination) via a new
`heroOverride`/`hideCollectionsBlock`/`relatedLinksSlot` prop set, with a
shared `CategoryPageView` wrapper for the category/style/intersection/
symbol-year cases. The product detail page's breadcrumb and "Категория"
fact now link to the real category URL and show the canonical label
(previously pointed at the product's own slug, since no category URL
existed yet).

**Bugs found and fixed during this build, not part of the original plan:**
- `CatalogClient`'s "scroll to results on mount" effect (built for
  `/catalog?style=X` deep links) was also firing on the new dedicated
  pages, scrolling straight past the hand-written intro copy on load — the
  whole point of the page. Fixed: the effect is now skipped whenever
  `heroOverride` is set.
- Passing `heroOverride`/`relatedLinksSlot` (elements created in
  `CategoryPageView`, not at `CatalogClient`'s own JSX call site) as fixed
  siblings among `<main>`'s other static children triggered React's
  "each child in a list should have a unique key prop" dev warning — React
  validates keys on a compiler-generated static children array whenever it
  contains an externally-created element. Fixed by giving those elements
  explicit `key` props at creation time in `CategoryPageView`.

## 4. `symbol_year` — backfill report

**Scope, exactly as planned:** only products whose own copy already claims
symbol-of-the-year status get a value; a product simply depicting a zodiac
animal without that claim stays null.

**A significant refinement was needed beyond the plan's original
heuristic**, found by inspecting the actual candidate set before applying
anything:

- A whole "Хохлома ёлочная игрушка" product line shares one boilerplate WB
  description template verbatim across dozens of unrelated items
  (Лошадка, Снеговик, Овечка, **Собака**, ...): *"Коллекция ... Хохлома.
  [ANIMAL] - символ года. В серию входят: [30+ other characters]..."* — and
  for most of these items the bracketed animal is simply wrong (always says
  "Дракон" regardless of what the item actually is). Trusting *any*
  "символ года"-shaped phrase near the top of the description (the plan's
  original design) would have tagged e.g. a plain "Собака" Christmas
  ornament as `symbol_year: 2030` — exactly the "realistic dog figurine"
  false positive the brief explicitly warns against, just reached by a
  different route (boilerplate leakage, not a title match).
- **The fix:** a claim is only trusted for a given animal if that animal has
  independent, title-level corroboration elsewhere in the catalogue — i.e.
  at least one product whose own **title** (not description) explicitly
  says "символ года/20XX" for that same animal. Checked against the real
  data: Дракон, Змея, Лошадь, Коза/Овца/Баран, Обезьяна all have dozens of
  title-level confirmations; **Петух, Собака, Свинья have zero** — nothing
  in this catalogue is genuinely marketed as a 2029/2030/2031 symbol today.
  This is computed from the data itself, not hardcoded, so it self-corrects
  if the shop later adds genuine Петух/Собака/Свинья symbol-year stock.
- **The one bug the brief itself names** — id=76 "Елочная игрушка Коза.
  Фарфор, Хохлома" has description "Фарфоровый дракон - символ года."
  (confirmed: id=3 has the identical title and correctly says "коза" in the
  same template slot) — is handled as an explicit, individually-verified
  `MANUAL_OVERRIDES` entry (`scripts/backfill-symbol-year.mjs`) rather than
  a generalized "trust title over a mismatched claim" rule, since that
  generalization is exactly what produced the Собака/Петух false positives
  above.
- Also fixed: the keyword list was missing "овеч" (Овечка) — the "овц" stem
  doesn't match that diminutive form.

**Result of the real run** (`npm run backfill:symbol-year`, applied for
real after a `--dry-run` review of all ~300 proposed changes plus manual
spot-checks of description text for the ambiguous cases): 299 rows changed,
0 excluded-as-incidental (the eligibility check already filtered those out
before the apply step). Published-product distribution:

| symbol_year | published count |
|---|---|
| 2024 (Дракон) | 3 |
| 2025 (Змея) | 21 |
| 2026 (Лошадь) | 49 |
| 2027 (Коза/Овца/Баран) | 49 |
| 2028 (Обезьяна) | 1 |

## 5. `/catalog/simvol-goda-{year}` — live years

Threshold: `MIN_SYMBOL_YEAR_PRODUCTS = 5` published products
(`lib/catalog-taxonomy.ts`), checked live at request time (not baked in) —
so a year's page appears or disappears automatically as stock changes, no
code change needed. Against the counts above: **2025, 2026, 2027 are live;
2024 and 2028 correctly 404** (3 and 1 published product respectively,
below threshold) — verified directly against the running dev server.
Copy exists for all 8 zodiac years (`symbol-year-copy.ts`) so 2028 goes
live automatically the moment its published count clears 5, with no
further code work.

## 6. "Новогодние подарки 2027"

Renamed from the brief's "Новогодняя коллекция 2027" per discussion with
the user — framed as a gift guide, not a themed collection. Sourced from
`is_top30` **exactly as flagged, all 88 products, unfiltered** — confirmed
deliberately with the user: these are the season's fast-turnaround,
well-stocked picks the business wants to push, not a claim that every item
is visually New-Year-themed. Lives at the top-level route
`app/novogodnie-podarki-2027/page.tsx` (not nested under `/catalog`, and not
part of the `[slug]` lookup-precedence resolver — it's a curated landing
page with its own copy + PDF block, the same reasoning Task 1 used for
`/o-nas`/`/kontakty`/`/korporativnye-podarki`).

**Found during the build:** this route sits outside the `(shop)` route
group, so it doesn't inherit `(shop)/layout.tsx`'s `SessionProvider` or
`catalog/layout.tsx`'s `CartProvider` — the page 500'd on first load
(`useSession must be wrapped in a <SessionProvider>`) until it was given its
own `auth()` read + `SessionProvider`/`CartProvider` wrap, exactly matching
the pattern `app/page.tsx` (the home page) already uses for the identical
reason.

- `is_top30` now also boosts `CatalogClient`'s default relevance sort
  (top-30 items float to the front when there's no active search query) —
  required adding `isTop30` to `ProductView`/`toProductView()`, which didn't
  flow through the display-view mapper before.
- The `.catalog-download` PDF block was duplicated verbatim across the
  homepage and `/korporativnye-podarki` already; this is now its **third**
  use, so it was extracted into `components/catalog/CatalogPdfDownload.tsx`
  and all three call sites updated — a small, directly-motivated dedup.
- Nav: added to both header variants and both mobile-nav panels via a new
  shared `NAV_LINKS` constant (`catalog-components.tsx`) consumed by all 4
  render sites, plus both footers — placed second, right after "Главная",
  for the "prominent entry point" the brief asked for. The shared constant
  specifically guards against a repeat of the "Контакты→#custom" copy-paste
  bug Task 1 found and fixed (that bug came from exactly this kind of
  4-way hand-duplicated link list).
- Homepage feature block (`.seasonal-feature`, new CSS in `globals.css`)
  sits above `CollectionsBlock`, linking to the new page.

## 7. Faceting policy — implemented exactly as planned, verified live

`/catalog/page.tsx`'s static `metadata` export is now `generateMetadata`
reading `searchParams`. Verified against the running dev server for every
case in the policy table:

| Query | Result |
|---|---|
| `/catalog` | indexable, no canonical (unchanged) |
| `?style=gzhel` | canonical → `/catalog/gzhel` |
| `?category=christmas&style=gzhel` (built intersection) | canonical → `/catalog/elochnye-igrushki/gzhel` |
| `?category=bells&style=gzhel` (not a built intersection) | `noindex, follow` + canonical → `/catalog/kolokolchiki` |
| `?sort=price-asc` (or any other param) | `noindex, follow` |
| `?style=garbage` (unrecognized value) | `noindex, follow` |

No 301s — canonical + noindex only, since the query-param filtering still
serves a real client-side UX purpose for combinations that don't have a
dedicated page.

## 8. Homepage metadata

`app/layout.tsx`'s title/description (the home page has no per-page
override, so the root layout's `metadata` export is what actually renders):
old title "Wood&Clay — фарфоровые изделия ручной работы" carried no
searchable query at all. New: **"Фарфоровые ёлочные игрушки и статуэтки —
Wood&Clay"**, description leads with the same phrase plus гжель/хохлома and
the new-products framing.

## 9. Sitemap

`app/sitemap.ts` now generates category/style/intersection routes directly
from `lib/catalog-taxonomy.ts`'s `CATEGORIES`/`STYLES`/`INTERSECTIONS` (not
hand-listed, so it can't drift), and symbol-year routes from
`distinctSymbolYears(MIN_SYMBOL_YEAR_PRODUCTS)` (the same live threshold
check the page resolver uses). Verified against the running dev server:
807 total URLs — 8 category + 3 style + 6 intersection + 3 symbol-year
(2025/2026/2027, matching §5 exactly) + 1 gift-guide page + existing static/
product routes.

## 10. Definition-of-done status

- [x] Every cluster has a live, server-rendered route with unique metadata
      and unique intro text — hand-verified via curl against the dev server
      for at least one page per cluster type.
- [x] `?style=`/`?category=` canonical/noindex table implemented and
      verified live (§7). No two indexable URLs serve the same product set.
- [x] `symbol_year` populated and verified, full report above (§4).
- [x] Новогодние подарки 2027 live, in both nav variants, both footers, on
      the homepage, linked to the PDF.
- [x] Taxonomy inconsistencies resolved and documented (§2).
- [x] All new routes in the sitemap (§9).
- [x] `npm run check` (typecheck + lint + build) passes clean — 0 errors,
      only the pre-existing `<img>`/`next/image` warnings this task didn't
      introduce or touch.
- [x] `npm run shots`-equivalent manual 390px check: category page, style
      page, intersection page, symbol-year page, gift-guide page, homepage
      feature block — all clean, no layout breaks, no console
      errors/warnings on any of them.
- [x] This file.

## What needs you

- **Yandex Webmaster**: submit the new routes for reindexing once deployed
  — the same relative-URL workaround that already worked for Task 1's pages
  (see the earlier "Некorrektный URL" fix in this session's history).
- **`collections.ts`'s "year-symbol" featured tile still hardcodes
  "коза"** (§2) — now that `symbol_year` exists, this should switch to
  reading it instead, but doing so means adding `symbolYear` to
  `ProductView` for a single call site that nothing else in this task
  needed. Small, but a real follow-up — flagging rather than doing it
  speculatively.
- **False "символ года" claims in `own_description` for non-corroborated
  animals** (Собака, Петух, Свинья — §4): the *attribute* is correctly
  null for these, but the underlying WB-sourced description text still
  says e.g. "Собака - символ года" on some product pages, visible to a
  customer reading the full description. Not fixed — rewriting that prose
  is content-writing work, closer to Task 3's territory, and this task's
  brief scoped it to the attribute specifically ("Only add/change" the
  attribute, not the copy).
- **Hero image for the homepage feature block**: shipped text-only
  (kicker/heading/lead/CTA), no product photo — kept deliberately simple
  given the task's already-large scope. Worth a look if the section reads
  as too plain once live.
