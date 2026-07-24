# CLAUDE.md

Repo root. Loaded automatically every session — don't paste it into chat.
Also works as `.cursor/rules/project.mdc` and as claude.ai Project instructions.

This is context, not enforcement. Anything that genuinely must not happen belongs in ESLint, CI, or a pre-commit hook.

---

## Project

**Wood&Clay** (Вуд-энд-Клэй) — premium hand-made, hand-painted porcelain. Christmas tree ornaments and interior pieces, painted in three Russian folk traditions: **Гжель**, **Хохлома**, **Жостово**. Own workshop plus curated partner ateliers.

Market: **Russia**. Site language: **Russian**. Audience skews female, 30–55, buying for themselves or as gifts — plus a B2B track of corporate gift buyers (HR, office managers, procurement) ordering 50–1000 units for New Year.

The commercial goal is to move out of marketplace price competition into a premium owned channel. **Everything on this site has to justify a price several times the Wildberries equivalent.**

## The one rule that overrides everything

**The objects are maximalist. The interface is silent.**

Ornament is concentrated into a few large choreographed moments per page, never sprinkled into corners, buttons, and dividers. Enormous negative space around products. If a decision would make the page busier, the answer is no.

The failure mode we are avoiding is *сувенирная лавка* — souvenir stall. It looks like: ornament everywhere, floral frames around buttons, four-icon trust bars, gradient overlays, drop shadows, three competing accent colours. Never build these.

## Stack

- Next.js (App Router, ≥16.2.11) · TypeScript strict · Tailwind
- Content: typed files in `content/`, validated with zod. No CMS.
- **Hosting: Russian datacentre** (Selectel / Timeweb Cloud / Yandex Cloud). Never Vercel — 152-ФЗ requires personal data to be stored on servers in Russia.
- Payments: **ЮKassa**, including **СБП/QR**. 54-ФЗ fiscalisation via cloud kassa.
- Analytics: **Яндекс.Метрика**. Never Google Analytics.
- Fonts: **self-hosted woff2, Cyrillic subset**, via `next/font/local`. Never a font CDN.
- Tests: Vitest, Playwright.

## Commands

```
npm run dev
npm run check      # typecheck + lint + build — must pass before you're done
npm run shots      # Playwright screenshots, all themes, 390 + 1440
npm run test
npm run e2e
```

## Layout

```
app/
  (shop)/                  retail
  korporativnye-podarki/   B2B landing — highest commercial priority
components/ui/             primitives
components/ornament/       SVG ornament + motion components
components/site/           header, footer, nav
content/pieces/            one file per object
content/workshops/         own workshop + partner ateliers
content/schema.ts          zod — invalid content fails the build
styles/themes/             gzhel.css, khokhloma.css, zhostovo.css, house.css
public/ornaments/          optimised SVG, one folder per style
DESIGN-BRIEF.md            visual direction — read before any UI work
MOTION-SPEC.md             the complete motion inventory — read before any animation
```

---

## Theming

Four themes: `house` (default), `gzhel`, `khokhloma`, `zhostovo`.

A theme is **only** a set of CSS custom properties plus an ornament folder. Switch via `data-theme` on a route-level wrapper. Never fork a component per theme, never branch on theme in JS, never hard-code a theme colour anywhere.

```tsx
<div data-theme="gzhel">…</div>
```

```css
[data-theme="gzhel"] { --ink: …; --ground: …; --accent: …; }
```

If you find yourself writing `if (theme === 'gzhel')`, the token set is missing a variable. Add the variable.

## Non-negotiable

**Performance.** Heavy imagery plus heavy motion — this will get slow unless it's defended at every step.
- LCP under 2.5s on simulated 3G Fast. The LCP element is the hero **photograph**, never an animation.
- `next/image` always, with explicit `sizes`, AVIF first, blur placeholder. Never a raw `<img>`.
- Ornament SVGs inlined and SVGO-optimised, ≤8 KB each. **Budget: 3 inline ornaments per viewport.**
- No animation library for anything CSS can do. No GSAP, no Framer Motion, unless `MOTION-SPEC.md` names it.
- Below-fold ornaments and turntables load on interaction or intersection, never eagerly.

**Motion.** Every animation must already exist in `MOTION-SPEC.md`. If a task seems to need one that isn't there, stop and ask — don't invent it. All motion sits behind `@media (prefers-reduced-motion: no-preference)`, and the reduced-motion state must be the *finished* state, never the empty one.

**Accessibility.** Semantic elements: `<a>` navigates, `<button>` acts. Never `tabindex` + click on a `div`. Visible focus rings on every theme, including the dark ones — check contrast against `--ground` per theme, not just the default. Decorative ornament SVGs get `aria-hidden="true"` and no focus. Every product image needs real Russian alt text; if you don't know what the piece looks like, write `TODO(alt)` and tell me.

**Russian first.** All UI strings in Russian, in the code, from the start. Never build against English placeholders — Cyrillic runs ~30% longer and breaks layouts English never would. Never write placeholder product copy, fake prices, or lorem ipsum. Typographic details: use « » guillemets, an em dash — with spaces, and a non-breaking space before ₽.

**Personal data.** Any form collecting a name, phone, or email needs an explicit unchecked consent checkbox linking to the privacy policy. Never pre-check it. Never send form data to a third-party endpoint outside Russia.

## Conventions

- Tailwind utilities. Real CSS only in `styles/` for `@font-face`, keyframes, theme tokens.
- Every colour and size from a token. Never a hex value or a magic pixel in a component.
- `cn()` (clsx + tailwind-merge) for conditional classes, not string concatenation.
- Named exports. `PascalCase` components, `camelCase` functions, `kebab-case` files.
- Handlers prefixed `handle`. Early returns over nesting.
- Prettier owns formatting — don't reformat code you didn't otherwise change.

## Definition of done

1. `npm run check` passes.
2. `npm run shots` run, and **you have looked at the 390px output**. Ornate layouts fail at mobile width in ways a desktop diff hides.
3. Checked on every theme the change touches, dark themes included.
4. Diff contains only files relevant to the task.
5. You've said what you skipped or couldn't verify.

## How to work

- **Plan first** for anything beyond a one-line fix. Wait for approval.
- **Stay in scope.** No adjacent refactors, no dependency upgrades, no improving files the task didn't name. Note it and move on.
- **One theme at a time.** Complete Gzhel end to end before starting Khokhloma.
- **Ask when the design is ambiguous.** A wrong assumption about visual register is expensive here. Design questions go to `DESIGN-BRIEF.md`; motion questions go to `MOTION-SPEC.md`; if the answer isn't in either, ask me.
- **New dependencies need approval**, with a reason, before installing.

## Commits

Conventional Commits: `<type>[scope]: <description>` — `feat` `fix` `chore` `docs` `style` `refactor` `perf` `test`.
Imperative mood, no trailing period, one logical change per commit. Never force-push `main`.
