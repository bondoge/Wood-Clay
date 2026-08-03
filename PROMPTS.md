# PROMPTS.md — session prompts for Wood&Clay

One session per prompt. `/clear` between them. Use plan mode (Shift+Tab twice) for every one.

Rule of thumb: if you can't review the diff in ten minutes, the session was too big.

---

## Session 1 — Foundations and tokens

*Prerequisites: none. Do this today.*

```
Read PLAN.md, DESIGN-BRIEF.md and MOTION-SPEC.md before doing anything.
CLAUDE.md is already loaded — don't run /init, we have one.

This session builds foundations only. The only page you create is /styleguide.

1. Verification harness, first, before any UI:
   - the `check` and `shots` scripts described in CLAUDE.md
   - a Playwright script that screenshots a given route at 390px and 1440px,
     once per theme, into /screenshots
   I want these working before you write a single component.

2. Theme system:
   - four themes as CSS custom properties, exactly the values in DESIGN-BRIEF §5:
     house, gzhel, khokhloma, zhostovo
   - switched by data-theme on a route wrapper, no JS branching, no per-theme components
   - spacing scale, type scale, radius (0), rule weights — all tokens

3. Typography:
   - self-host Cormorant (display) and Golos Text (body) via next/font/local
   - Cyrillic subset if you can subset them; if not, self-host the full files and say so
   - if you can't fetch the font files at all, stop and tell me —
     do not fall back to a Google Fonts <link>

4. /styleguide rendering every token: the full type scale set in Russian,
   all four palettes, the spacing scale, a button per theme, rules.

Constraints:
- Russian strings throughout. Real ones. No English placeholders.
- No ornaments, no product photos, no animation except M3 and M7 from MOTION-SPEC.
- No new dependencies beyond Playwright without asking me.

Before writing code: show me your plan, and list anything in the three docs
that is ambiguous, contradictory, or that you think is wrong.
I would rather answer questions now than review guesses later.

Done means: npm run check passes, npm run shots produces screenshots at both
widths for all four themes, and you've told me what you skipped.
```

---

## Session 2 — Content schema

*Prerequisites: session 1 merged.*

```
Build the content layer described in PLAN.md §5. Schema and fixtures only — no pages.

- zod schemas in content/schema.ts for: piece, workshop, master, style, occasion, packaging
- typed loaders with build-time validation: invalid content fails the build
- three real fixture pieces, one per style, using real data I'll give you —
  ask me for it rather than inventing prices or dimensions
- a unit test proving invalid content fails

No UI this session.
```

---

## Session 3 — Corporate landing page

*Prerequisites: sessions 1–2, plus your real copy and past-order photos. **This is the deadline page — target early September.***

```
Build the page at /korporativnye-podarki. Read DESIGN-BRIEF §13 for its single
job, CLAUDE.md for constraints, and MOTION-SPEC (including the new M10 and M11)
for motion. Propose the plan before building.

All copy is in content/corporate.ts — I've written it, use it VERBATIM. Do NOT
generate or paraphrase any Russian marketing copy. If any section below has no
matching copy in that file, STOP and tell me which — don't invent it.

House theme. This is a sales/ordering page, not an exhibition — restrained.

SECTIONS, in this order (all from content/corporate.ts):
hero → whatWeMake → whyHandmade → reviews → packaging → bulk → custom →
pdf → form → contact

TWO DISTINCT CALLS TO ACTION — do not merge them:
- bulk.cta ("Рассчитать заказ") → scrolls to / opens the quote FORM below.
- custom.cta ("Обсудить в Telegram") → links DIRECTLY to t.me/<handle>
  (I'll put the handle in — leave it as a clearly-marked constant at the top).
  No form for custom orders; it's a direct human conversation.

REVIEWS (M10 + M11), the section that needs the most care:
- Each review in corporate.ts reviews.items renders as a card: the customer's
  first name, 5 stars DRAWN in the active theme (from `stars`, not an image),
  the quote text in our typography (NOT a screenshot), and their photo(s).
  Image URLs = reviews.baseUrl + each filename in `images[]`.
- Reviews with multiple images use M10 photo-fan: fanned, overlapping, natural
  aspect ratios (no square crop), hover-to-front on desktop, slow auto-cycle
  on mobile. Single-image reviews render one photo flat.
- Behind the whole section: M11 review-grid-columns — the dark, dim, slowly
  scrolling vertical columns of images from reviews/grid/. It must stay quiet
  behind the bright review cards. Keep it dark and slow.
- FILENAMES for the grid: do NOT hardcode them or assume a numeric range
  (there are gaps and mixed .webp/.jpg). Write a small BUILD-TIME script that
  lists the reviews/grid/ bucket prefix (S3 list-objects, using the S3 creds
  already in the seed project's .env pattern — read them from this repo's .env,
  don't hardcode) and generates content/reviews-grid.ts with the actual
  filename list. The M11 component reads that generated file. Also downscale
  those grid images to ~600px long edge during that build step if the sources
  are large — they're dim background. Tell me how to re-run the script.

QUOTE FORM (bulk path): collects the fields in corporate.ts form.fields.
Unchecked consent checkbox linking to the privacy policy, never pre-checked.
- Posts to our own Next.js API route. No third-party form services, nothing
  outside Russia.
- The route sends the lead to Telegram via TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
  from .env (already set). Never hardcode them; fail loudly in dev if missing.
- Telegram-notification only — do NOT store submissions in a database.
- Add a honeypot field or simple rate-limit (public form, spam).

PDF: pdf.cta button is present, but I have NO pdf file yet — render the button
disabled or with a "скоро" state, and do NOT wire a broken link. Tell me where
to drop the PDF later and what to change to enable it.

STICKY HEADER: Telegram + phone visible (values in corporate.ts contact).

MOTION overall: per MOTION-SPEC — M3 (brush-underline) and M7 (reveal) for the
page, plus M10/M11 for reviews. No ornament (per MOTION-SPEC §3 this page is
ornament-exempt). Everything behind prefers-reduced-motion with the finished
state as default.

IMAGES: next/image with explicit sizes, AVIF, for review photos. The reviews/
images and reviews/grid/ images are on Selectel — make sure next/image is
configured to allow that remote domain
(1bdb1afd-641e-4c4c-be89-1010e798b2e5.selstorage.ru).

DONE means: npm run check passes; npm run shots at 390 + 1440 (House theme),
and you've looked at the 390 output — the fanned reviews and the column
background are the things most likely to break on mobile. Tell me what you
skipped or couldn't verify (e.g. the PDF, the real Telegram handle).

House theme only. Copy is in content/corporate.ts — I've written it, use it verbatim.
```

---

## Session 4 — First style world (Gzhel only)

*Prerequisites: ornament SVGs delivered by the illustrator, hero photography shot.*

```
Build the Gzhel style page. Gzhel only — do not touch Khokhloma or Zhostovo.

Read MOTION-SPEC in full. Implement, in this order:
1. M1 ornament-draw on section dividers
2. M5 wash-spread as the theme's only gradient language — no linear-gradient
   anywhere on this theme
3. M4 ornament-overflow on the hero. This is the signature. Once on the page.

Ornament SVGs are in public/ornaments/gzhel/. Inline them, SVGO them,
aria-hidden them.

Absolute requirement from MOTION-SPEC §1: the static default state is the
FINISHED state. Verify the page is fully readable with animation-timeline
unsupported and with prefers-reduced-motion: reduce.

Stay inside the §3 per-page budget. If you think you need to exceed it, stop and ask.

Show me screenshots at 390 and 1440 before you consider this done.
The mobile one is the one I actually care about.
```

---

## Session 5 — Piece page and checkout

```
Build the product page and ЮKassa checkout, including СБП.
Read PLAN.md §1 for the payment stack.

Piece page job (DESIGN-BRIEF §13): convince it's hand-made, show exactly how big it is.
So: brushwork macro and scale reference are required elements, not optional ones.

Checkout: ЮKassa with СБП/QR, cloud kassa for 54-ФЗ receipts.
Gift packaging as a selectable option.
Test in ЮKassa sandbox — do not touch live credentials.
```

---

## Session 6 — Theme replication

*Only after Gzhel is finished and you're happy with it.*

```
Replicate the Gzhel page structure for Khokhloma and Zhostovo.

If this requires anything beyond swapping the data-theme value and the
ornament folder, the theming system is wrong — tell me what's leaking
instead of forking the components.

Both are dark themes: contrast-check every focus ring against --ground.
This is the most likely thing to be broken and the least likely to be noticed.
```

---

## Prompts that waste a session

- "Make the website" — produces a generic template you'll throw away
- "Make it look more premium" — unmeasurable; name the element, the viewport, and the token
- "Fix the mobile version" — which page, which width, what's wrong, screenshot?
- "Add some animations" — MOTION-SPEC exists so this is never a judgement call
- Anything spanning three sessions' worth of work in one message

## The shape of a good one

Name the **file**, the **viewport**, the **constraint**, the **reference document**, the **boundary** ("don't touch X"), and the **verification step**. Six things. Every prompt above has all six.
