# DESIGN-BRIEF.md — Wood&Clay

Filled from the moodboards and the business brief. Sections marked **⬜ ТВОЁ** need your decision — everything else is a proposal you can overrule. This file is the agent's source of truth for every visual decision.

---

## 1. The thesis

> **The object is maximalist. The page is silent.**

A Wood&Clay page should feel like a lit vitrine in a dark museum room, or a single painted tray on a white gallery wall. The porcelain carries every bit of colour and pattern. The interface carries almost none — until one deliberate moment when the painting steps off the object and takes over the page.

Three seconds in, someone should think: *this costs more than I expected, and that seems right.*

## 2. Positioning

Not: a souvenir shop, a folk-craft marketplace, a Wildberries storefront with better photos.
Instead: a small house that commissions and curates hand-painted porcelain, in the register of Ginori 1735 or Fabergé — but Russian, contemporary, and unembarrassed about folk tradition.

The tension to hold: **folk art without kitsch.** Gzhel, Khokhloma and Zhostovo are living crafts with real grammar. Treat them as design languages, not as decoration.

## 3. Audience

| | Retail | Corporate |
|---|---|---|
| Who | Women 30–55, buying for themselves or gifting | HR / office manager / procurement, mostly women |
| Deciding between | This and a nicer-than-usual gift | This and branded merch, alcohol, gift certificates |
| Needs | To believe it's hand-made and worth the price | Volume, lead times, branding options, one contact person |
| Kills the sale | Looks like a souvenir. Can't judge the size. | Can't find a price range or a phone number |

## 4. References and anti-references

**Take from:** Ginori 1735, Fabergé, Buccellati (how ornate objects get premium treatment) · Hermès scarf pages (maximalist pattern, silent layout) · Aesop (restraint, product-as-hero) · museum collection sites — Hermitage, V&A (object photographed with reverence, deep negative space) · the BridgeBio ad you attached, read as: one idea per screen, confident type, no clutter.

**Never look like:** the Miami Beach Bicycle Center screenshot — everything shouting, three typefaces, promo banners fighting the product · marketplace card grids · Christmas-themed sites with snowflake overlays and red-green palettes · "heritage" e-commerce templates with ornament in every corner and floral frames around buttons.

**⬜ ТВОЁ:** confirm my reading of the two attached screenshots (reference / anti-reference).

---

## 5. Colour

### House theme — the default, and deliberately colourless

The main page, corporate page, checkout, and all chrome. **No colour of its own**, because it has to hold three craft worlds without picking a favourite. Colour enters the site only where a craft enters.

```css
--house-ink:      #17150F   /* text, near-black, warm */
--house-ground:   #FBFAF7   /* page — bright, not cream */
--house-bisque:   #E9E4DA   /* unglazed porcelain, section grounds */
--house-muted:    #6E685D   /* secondary text (named --house-shadow originally — renamed, see §5a: "shadow" reads as a box-shadow token, which this site bans) */
--house-gilt:     #A88B4A   /* hairlines and rules ONLY, never a fill */
```

The gilt is used at **1px**, as a rule or an underline. Never a gold button, never a gold gradient. A gold fill is the single fastest way to look cheap.

### Gzhel — гжель

Cobalt on porcelain. Note that porcelain white is **cool**, not cream — this alone separates you from every AI-generated heritage template.

```css
--gzhel-ink:      #101A33
--gzhel-cobalt:   #17357F   /* the saturated end of the stroke */
--gzhel-deep:     #0C1C4A
--gzhel-wash:     #6B8FD4   /* the diluted end — see мазок с тенью below */
--gzhel-ground:   #F6F8FB   /* cool porcelain white */
--gzhel-glaze:    #E1E8F2
```

**The craft detail that becomes the design system:** Gzhel's signature technique is «мазок с тенью» — one loaded brushstroke that grades from saturated cobalt to nearly transparent in a single motion. Make that the page's entire gradient language. Every gradient on the Gzhel theme is cobalt → transparent along a stroke direction. No generic CSS linear-gradients anywhere.

### Khokhloma — хохлома

Gold, cinnabar, lacquer black on a warm ground.

```css
--khokhloma-ink:      #F1E4C9   /* light text on dark ground */
--khokhloma-ground:   #120C08   /* warm lacquer black */
--khokhloma-linen:    #EFE4CE   /* the light alternate ground */
--khokhloma-gold:     #D9A22B
--khokhloma-cinnabar: #A8261C   /* true cinnabar — not fire-engine red */
--khokhloma-ember:    #6E1A10
```

### Zhostovo — жостово

Polychrome bouquet on black lacquer, gold рим.

```css
--zhostovo-ink:     #F2E9D8
--zhostovo-ground:  #0A0A0C   /* deepest of the three */
--zhostovo-rose:    #C23A57
--zhostovo-blush:   #E8A9B4
--zhostovo-leaf:    #4A5D3A
--zhostovo-gold:    #C9A24D
```

**Contrast check required on all three dark themes**, including focus rings. Don't assume the house focus ring is visible on `#0A0A0C`.

### 5a. Resolved: the shared semantic layer (Session 1)

This file gives each theme its own prefixed, theme-specific colours (above). `CLAUDE.md`'s theming section instead shows components reading generic tokens (`--ink`, `--ground`, `--accent`) that get redefined per `data-theme`. Both are correct, at different layers — resolved in Session 1 as follows, so it isn't re-litigated:

Every theme file defines two layers:
- **The literal colours above**, unprefixed within their own `[data-theme="x"]` scope (e.g. `--cobalt`, `--deep`, `--wash` inside the Gzhel block) — for bespoke per-theme work: gradients, ornaments, anything craft-specific.
- **A shared semantic layer every theme guarantees**, which shared primitives (buttons, type, rules) consume so no component ever branches on theme:

| Semantic token | House | Gzhel | Khokhloma | Zhostovo |
|---|---|---|---|---|
| `--ink` | ink | ink | ink | ink |
| `--ground` | ground | ground | ground | ground |
| `--surface` | bisque | glaze | linen | *derived* — no literal alt-surface was given for this theme; `--ground` lightened slightly toward `--ink` (not a `--blush`/`--rose` tint, which would colour every alternating section pink) |
| `--muted` | muted (literal, above) | *derived* — `--ink` at 65% opacity (5.27:1 against `--ground`) | *derived* — `--ink` at 65% opacity (6.85:1) | *derived* — `--ink` at 65% opacity (7.16:1) |
| `--accent` | gilt | cobalt | cinnabar | gold |
| `--rule` | gilt | **wash** — not ink@20%. The diluted мазок-с-тенью stroke *is* this theme's hairline concept; a neutral grey would waste it. Overrides §7's "1px `--gilt` on light themes," which assumed a gilt-equivalent Gzhel doesn't have. | ink @ 20% (per §7) | ink @ 20% (per §7) |
| `--focus` | gilt (3.12:1 against `--ground`) | cobalt (10.66:1) | **gold**, not cinnabar — cinnabar only reaches 2.74:1 against `#120C08`, below the 3:1 UI-contrast minimum; gold clears 8.46:1 | gold (8.25:1, same as `--accent` here) |

No new literal hex values were invented for `--muted`/`--surface` where the brief was silent — both are formulas (opacity mix / colour-mix) rather than picked colours, so they move automatically if the underlying palette ever changes.

---

## 6. Typography

**Hard requirement: full Cyrillic, self-hosted woff2, Cyrillic subset only.** Google Fonts CDN is unreliable in Russia and adds a third-party request you don't want under 152-ФЗ.

**Do not use** «вязь», Izhitsa, or any faux-Slavic display face. It is the fastest possible route to souvenir-stall. The tradition is in the ornament, never in the letterforms.

### Free path (default)

- **Display — Cormorant / Cormorant Garamond.** High-contrast, genuinely elegant Cyrillic, and noticeably less worn out than Playfair Display, which your moodboard uses and which every AI-generated site reaches for.
- **Body — Golos Text.** Excellent, neutral, purpose-built Cyrillic. Invisible in the right way.
- **Utility — Golos Text**, uppercase, wide tracking, for dimensions, edition numbers, labels.

### Paid path (recommended if budget allows) — **⬜ ТВОЁ**

A licensed Cyrillic display face from a Russian foundry — **type.today**, **Brownfox**, or **Paratype** — for 8–30k ₽ is the cheapest available upgrade to perceived quality, and it makes the brand un-copyable by a competitor using Google Fonts. Look at type.today's Kudryashev Display for the high-contrast register this brief wants.

### Scale

```
0.75 / 0.875 / 1 / 1.25 / 1.5 / 2 / 3 / 4.5 / 7   (rem)
```

Display line-height 1.05 · body 1.6 · measure max 68ch (Cyrillic runs wider than Latin — don't reuse a 75ch Latin measure).

Display type should be set **large and sparse**. A 7rem headline with nothing around it does more premium work than any ornament.

---

## 7. Space and shape

- Spacing scale: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 / 192`
- **Border radius: 0.** Hard edges throughout. Rounded corners plus folk ornament reads as a template; the tension between a hard rectangle and an organic painted curve is the whole look.
- **Shadows: none.** Depth comes from tonal contrast and from the parallax layers, never from a box-shadow.
- Rules: 1px `--gilt` on light themes, 1px at 20% ink on dark.
- Generosity is the point. Section padding starts at 128px desktop / 64px mobile and goes up.

## 8. Grid

- Max content width 1440, text column max 720
- 12 columns desktop / 6 tablet / 1 mobile, 24px gutter
- Mobile-first. **390px is the design viewport.** Most of your Wildberries audience is on a phone and will stay on a phone.

---

## 9. Photography rules

- Ratios: hero 3:2 · card 4:5 (portrait — figurines are vertical) · detail 1:1 · macro 16:9
- **Hero = real set, always.** Real shelf, real fir, real depth of field. Never a cutout composited onto a fake background — white porcelain against the dark Khokhloma and Zhostovo grounds will fringe, and thin-walled porcelain has translucent edges a hard mask destroys.
- **Card = cutout**, shot on mid-grey with a rim light for clean alpha matting. This version is what the ornament overflows from.
- Every flagship piece needs a **brushwork macro**. A visible brush edge or a cobalt stroke fading to nothing sells "hand-painted" faster than any paragraph.
- Every tree ornament needs a **scale reference**. Size misjudgement is the main driver of returns.
- No hover zoom on cards. Cards are still; movement is reserved for the ornament.

## 10. The signature

**«Роспись сходит с фигурки»** — the painting steps off the figurine.

On each style page hero: a real photograph of the object, and an ornament layer whose paths **originate at a specific point on the object itself** — the edge of a painted flower on the porcelain — then draw outward and spread across the page ground as you scroll. The pattern on the object becomes the pattern of the page.

This happens **once per page**. It is the thing the site is remembered by. Everything else stays quiet so that it lands.

Full implementation in `MOTION-SPEC.md`.

## 11. Motion

Full inventory in `MOTION-SPEC.md`. Governing principle: **motion imitates the brush, never the browser.** Everything is a stroke being drawn, a petal opening, a wash spreading. Nothing bounces, nothing springs, nothing slides in from off-screen.

Reduced-motion is respected everywhere, and the reduced state is the *finished* state.

---

## 12. Voice

- Register: quiet, specific, confident. Never salesy.
- Person: «мы» — a house, not an individual.
- Three adjectives: **точный, тёплый, сдержанный**.
- Say the concrete thing. «Расписано вручную мастером Ириной К., мастерская в Гжели» beats «изысканная ручная работа» every time.
- Guillemets « », em dash — with spaces, non-breaking space before ₽.

**Words we don't use:** «элитный», «эксклюзивный», «изысканный», «роскошь», «уникальный», «шедевр», «не имеющий аналогов». Every one of them is a marketplace word and each one costs you money on this site.

**Buttons are literal.** «Смотреть коллекцию», «Заказать корпоративный подарок», «Добавить в корзину». Never «Подробнее». An action keeps its name through the whole flow.

**Empty and error states give direction, not mood.** Say what happened, say what to do.

---

## 13. Pages and their single job

| Page | Its one job |
|---|---|
| Главная | Make three craft worlds legible in five seconds and send you into one |
| Гжель / Хохлома / Жостово | Immerse in one tradition; sell the flagship |
| Фигурка месяца | One object, treated like an exhibition |
| Карточка товара | Convince it's hand-made and show exactly how big it is |
| **Корпоративные подарки** | **Get a qualified quote request. Nothing else.** |
| Мастерские | Prove the people are real |
| Процесс | Prove the labour is real |
| Упаковка | Make the box feel like part of the gift |

The corporate page is a different animal from the rest of the site: no cart, no browsing, one path to a form and a Telegram link. Restrained motion. It is a sales document, not an exhibition.

---

## 14. ⬜ Decisions still needed

1. **Price band of the flagship pieces** — 5k / 15k / 50k ₽? The entire visual register keys off this.
2. **Own production vs. partner ateliers** — what's the split, and should it be visible? (My strong recommendation: yes, visible. Curation is a premium signal; hiding it is a risk.)
3. **RU only, or RU + EN** at launch?
4. Confirm the reference / anti-reference reading in §4.
5. Budget for a licensed Cyrillic display face?
6. Do you have a logo/wordmark you're committed to, or is that in scope?

---

## Instruction to the agent

Derive every colour, size, and type decision from this file. If something isn't specified, ask rather than choosing — then add the answer here. Before building any page, state the plan in terms of these tokens, and flag anything that would read as a generic default rather than a choice made for Wood&Clay specifically.
