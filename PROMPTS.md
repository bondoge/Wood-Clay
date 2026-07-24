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
Build /korporativnye-podarki. Read DESIGN-BRIEF §13 for its single job.

This page is a sales document, not an exhibition. Per MOTION-SPEC §3 it is
exempt from ornament entirely: M3 and M7 only.

Sections, in this order:
hero → what we make → why hand-made matters for corporate gifting →
branding options → volume tiers and lead times → past orders →
PDF catalogue download → quote form → contact

The quote form collects: company, contact person, phone, Telegram,
quantity, budget per gift, deadline, branding needed, delivery region.
It needs an unchecked consent checkbox linking to the privacy policy —
never pre-checked, per CLAUDE.md.

Form submissions post to our own API route and notify a Telegram bot.
No third-party form services, no endpoints outside Russia.

Put Telegram and phone in the sticky header. Russian B2B runs on Telegram.

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
