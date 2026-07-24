# Porcelain figurine brand site — workflow & plan

A build plan for a solo founder using AI coding agents. Read once, then work through it in order.

---

## 0. The fork that determines everything else

Decide this before touching any tool. Everything downstream changes.

| | **A. Catalogue + enquiry** | **B1. Shopify** | **B2. Custom + payments** |
|---|---|---|---|
| Best for | Gallery pieces, made-to-order, commissions, wholesale | Real inventory, many SKUs, repeat orders | Small curated range, distinctive design matters most |
| You maintain | Almost nothing | Almost nothing | Everything |
| Build time | 1–2 weeks | Days (theme) | 4–8 weeks |
| Monthly cost | ~€20 | ~€30–60 | ~€20 + Stripe fees |
| Design ceiling | High | Medium (theme-bound) | Highest |

**Honest recommendation:** if you have under ~30 pieces and they're precious/slow-moving, start at **A**. A beautiful catalogue with a working enquiry form sells artisan porcelain better than a mediocre checkout. Add commerce in phase 2 once you know what actually sells.

If you *do* need a cart, choose **B2 only if the visual identity is a genuine differentiator**. Do not hand-roll EU VAT, shipping zones, and inventory — use Stripe Checkout or Shopify's Storefront API as the backend and keep your custom front end.

### Netherlands-specific things to plan for now, not at launch

Selling to consumers from NL means your site needs a few things a US tutorial won't mention:

- **Footer identifiers:** KvK number, BTW-id, registered address, contact email.
- **Required pages:** algemene voorwaarden, privacyverklaring, verzending & retourbeleid, and a clear statement of the 14-day herroepingsrecht (with the model withdrawal form).
- **VAT:** BTW shown inclusive for consumers. Cross-border EU sales above the €10,000 threshold pull you into the OSS scheme.
- **Cookie/consent banner** only if you actually load analytics or embeds — the cleanest answer for a small brand site is to use a cookieless analytics tool (Plausible, Fathom, Vercel Analytics) and skip the banner entirely.
- **Fragile-goods shipping:** figure out packaging and carrier before you write shipping copy. Breakage policy is a content decision, not a legal afterthought.

I'm not a lawyer — have a Dutch accountant or the KvK's free advice service sanity-check the commercial setup.

---

## 1. Assets first. This is the real bottleneck.

**Do not start building pages until this exists.** Agents fill empty content with lorem ipsum, and lorem ipsum produces lorem-ipsum-shaped layouts that fall apart the moment real content arrives. For a porcelain brand, the photography *is* the product page.

### Shot list — repeat identically for every piece

1. Hero, seamless background, straight-on
2. Three-quarter angle
3. Glaze/detail macro (this is what separates porcelain from resin — show it)
4. Scale reference (hand, or a coin, or a ruled line)
5. One styled in-situ shot (shelf, windowsill, plinth)

Shoot everything in one session with identical lighting and background. Consistency across the grid matters more than any single image being perfect. Export ≥3000px on the long edge, sRGB, and let the framework generate derivatives — never hand-resize.

### Product data — one spreadsheet, all fields filled

`slug, name, collection, edition_size, year, height_mm, width_mm, weight_g, materials, glaze, price_eur, in_stock, story, care, alt_text_1..5`

The `story` field (2–3 sentences per piece) is the highest-leverage copy on the whole site. Write it yourself. It's the one thing an agent genuinely cannot do for you.

### Brand basics

Logo/wordmark, two typefaces, a 5-colour palette, and one sentence describing the feeling. Write these down in `DESIGN-BRIEF.md` (template included) — this file becomes the agent's design constitution.

---

## 2. Tooling: what to actually buy

### Figma — probably skip it

The thing you heard about is real: Figma's MCP server lets a coding agent read frames, variables, and components instead of guessing from a screenshot. It works with Claude Code, Cursor, VS Code, and Codex.

But check the gate before you budget for it. Figma's MCP server requires a **Dev or Full seat on a paid plan**. View and Collab seats are capped at roughly **six tool calls per month** on *every* plan, including Enterprise — that's a demo, not a workflow.

**When it's worth it:** you already work in Figma, you're hiring a designer, or you're building a real multi-brand design system.

**When it isn't:** a solo founder building a six-page brand site. You'd spend two weeks learning Figma to produce mockups that an agent can render directly in code in an afternoon — and the code version is the one you can actually look at on your phone.

**The cheaper loop that works just as well:** collect 10–15 reference images into a moodboard, write `DESIGN-BRIEF.md`, then iterate in code. Take a screenshot, paste it into the chat, say what's wrong. Vision feedback on a real rendered page is a stronger signal than a static mockup, because it catches spacing, type rendering, and responsive behaviour that a mockup hides.

If you *do* buy Figma: design **three screens only** — home, collection index, product detail — at 1440px and 390px. Nothing else. Then connect the MCP server and hand frames to the agent one at a time.

Worth knowing: **Claude Design** (canvas + design tools you drive by chat) covers a lot of the exploratory-mockup ground without a Figma seat. Reasonable place to try directions before committing.

### Vercel — yes, with one caveat

Right choice for Next.js. The single most valuable feature for agent-driven work isn't performance — it's **a preview deployment per branch**. The agent pushes, you get a real URL, you look at it on your actual phone in actual daylight. That closes the feedback loop far better than reading a diff.

Caveat: the **Hobby tier is non-commercial**. A shop needs **Pro (~$20/mo)**. Alternatives worth a look: Cloudflare Pages/Workers (cheaper at image-heavy scale), Netlify.

### The cursor.directory ruleset — don't paste it

I read it. It's a reasonable generic starter, but it has real problems for your project:

1. **It contains Svelte syntax, in a React ruleset.** `class:` instead of a ternary, and `on:click` / `on:keydown` on elements — none of that is JSX. An agent trying to follow those rules in a Next.js project will either ignore them (fine) or produce something broken (not fine).
2. **"Focus on readability over performance"** is exactly backwards for an image-heavy product site. Your LCP is a photo of a figurine. Slow product pages cost sales and rankings. You want the opposite instruction.
3. **"Don't use semicolons"** and similar style rules belong in Prettier and ESLint, not in a prompt. Tooling enforces; prose only suggests.
4. **The accessibility advice is subtly wrong** — bolting `tabindex="0"` and click handlers onto anchors is an anti-pattern. Use real `<a>` and `<button>` elements and you get keyboard behaviour for free.
5. **"Be concise, minimize prose"** actively fights you when you want the agent to explain its plan before writing code.

**And the mechanism is wrong too.** Pasting rules at the start of every conversation is manual, forgettable, and burns context. Every tool has a proper place for this:

- **Claude Code** → `CLAUDE.md` in the repo root, loaded automatically at the start of every session
- **claude.ai** → Project instructions
- **Cursor** → `.cursor/rules/`

Use the `CLAUDE.md` included alongside this plan instead. It's written for your stack, and it's short — long rule files get diluted.

One thing to understand: `CLAUDE.md` is **context, not enforcement**. The agent reads it and usually follows it, but nothing blocks a violation. Anything that genuinely must not happen belongs in a lint rule, a CI check, or a pre-commit hook.

---

## 3. Day one: repository setup

```bash
npx create-next-app@latest porcelain-site --typescript --tailwind --app --eslint
cd porcelain-site
git init && git add -A && git commit -m "chore: initial scaffold"
```

Pin to a patched release — Next.js **16.2.11+** (Active LTS) as of late July 2026; 15.5.21+ if you're on the 15 line. There was a security release on 20 July 2026 covering several App Router issues, so don't start on an older patch.

Then, before writing a single page:

```bash
npm i -D prettier prettier-plugin-tailwindcss vitest @playwright/test
npx playwright install chromium
```

Add these scripts to `package.json` — **the agent's ability to verify its own work depends entirely on these existing**:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "vitest run",
    "e2e": "playwright test",
    "check": "npm run typecheck && npm run lint && npm run build"
  }
}
```

Drop in `CLAUDE.md` and `DESIGN-BRIEF.md`, commit, push to GitHub, connect the repo to Vercel. Setup is done.

---

## 4. How to run the agents professionally

This section matters more than the stack choice. The difference between a good and bad result is almost entirely process.

### The loop

```
write a brief  →  plan mode  →  branch  →  implement  →  agent self-verifies
      →  push  →  preview deploy  →  you review the URL  →  merge  →  /clear
```

### The ten rules

**1. Git is the safety net. Never work without it.**
One branch per task. Never let an agent start on a dirty working tree — if you can't tell what it changed, you can't review it. `git diff` before every commit, every time.

**2. Plan before code, always.**
Use plan mode (Shift+Tab twice in Claude Code) for anything beyond a one-line fix. Read the plan. Reject it if it touches files it shouldn't. Correcting a plan costs thirty seconds; correcting an implementation costs an hour.

**3. Scope tasks to one reviewable PR.**
"Build the site" produces slop. "Build the product detail page for a single hard-coded piece, mobile-first, with the image gallery deferred" produces something you can actually check. If you can't review the diff in ten minutes, the task was too big.

**4. Give the agent a way to check its own work.**
This is the highest-leverage thing on this list. An agent that can run `npm run check` and a Playwright screenshot script will catch most of its own mistakes before you see them. An agent that can't is guessing. Write the verification scripts *first*.

**5. Feed it screenshots.**
For anything visual, paste a screenshot of the current state and say what's wrong. Vision feedback beats description by a wide margin. Same for design references — a picture of the aesthetic you want is worth three paragraphs describing it.

**6. Use subagents for exploration.**
Research, doc-reading, and repo-scanning generate enormous context noise. Delegate those to a subagent so your main thread stays focused on the actual task. Plan mode does this automatically for repo scans.

**7. `/clear` between unrelated tasks.**
A long context isn't a richer context — it's a diluted one. Stale conversation makes the agent worse, not better. Clear between tasks; `CLAUDE.md` reloads automatically.

**8. Keep `CLAUDE.md` short and factual.**
Build commands, conventions, project layout, hard rules. If something is a multi-step procedure or only applies to one folder, it belongs in a skill or a path-scoped rule, not the main file. A bloated rules file gets followed less consistently, not more.

**9. Enforce with tooling, not prose.**
Style → Prettier. Correctness → TypeScript strict + ESLint. Performance → a Lighthouse CI budget that fails the build. Accessibility → `eslint-plugin-jsx-a11y` + an axe check in Playwright. Anything genuinely non-negotiable → a pre-commit hook. Don't ask the agent to remember what a machine can guarantee.

**10. You own the content and the taste.**
Delegate implementation. Never delegate the product stories, the pricing, the photography selection, or the final judgement on whether a page looks right. That's the part that makes it your brand.

### Prompts that work vs. prompts that don't

> ❌ "Make the product page look better."

> ✅ "The product page hero is at `app/pieces/[slug]/page.tsx`. On mobile (390px) the image sits too close to the title and the price is competing with the edition number for attention. Screenshot attached. Follow `DESIGN-BRIEF.md`'s type scale. Change only the hero block — don't touch the gallery below it. Run `npm run check` and take a Playwright screenshot at 390px and 1440px when you're done."

The second one names the file, the viewport, the constraint, the reference, the boundary, and the verification step. That's the whole skill.

---

## 5. Build phases

### Phase A — Skeleton (day 1–2)
Routes, layout, header/footer, typography loaded via `next/font`, colour tokens as CSS variables, a `/styleguide` page rendering every token and component. Ship to Vercel. **Deploy something ugly on day one** — you want the pipeline proven before it matters.

### Phase B — Design system (day 3–5)
Work through `DESIGN-BRIEF.md`. Build the primitives only: type scale, spacing scale, buttons, the image component, the piece card. Review on `/styleguide`. Iterate here, not on pages — fixing tokens later means touching every page.

### Phase C — Content layer (day 5–7)
Product data as typed local files first (MDX or TypeScript objects in `content/`) — **do not add a CMS yet**. A local file is faster to build against and trivially migrated later. Add a zod schema so bad data fails the build. Only reach for a CMS (Sanity, Payload) when someone other than you needs to edit content.

### Phase D — Pages (week 2)
Home, collections index, collection detail, piece detail, about/atelier, contact/enquiry, legal pages. One page per branch. Home last — you'll design it better once the other pages have taught you what the brand looks like.

### Phase E — Commerce, if you chose B (week 3)
Stripe Checkout is the shortest path: no cart state to maintain, PCI handled, EU payment methods (iDEAL matters a lot in NL) included. Add a real cart only when you have evidence people buy more than one piece at a time.

### Phase F — Polish (week 3–4)
Performance budget (target LCP <2.5s on 4G — with these image sizes this is the one that will bite you), `next/image` with proper `sizes`, blur placeholders, accessibility audit, structured data (`Product`, `Organization`, `BreadcrumbList`), OG images, sitemap, robots.txt, 404/500 pages.

### Phase G — Launch
See the checklist below.

---

## 6. Launch checklist

- [ ] Lighthouse ≥90 on performance and ≥95 on accessibility, on a **product page**, on mobile
- [ ] Every image has meaningful `alt` text (write it yourself — "porcelain figurine" is not alt text)
- [ ] Keyboard-navigable end to end; visible focus rings; `prefers-reduced-motion` respected
- [ ] Tested on a real phone, outdoors, on mobile data
- [ ] Enquiry/checkout flow completed end to end by someone who isn't you
- [ ] Legal pages live; KvK + BTW in footer
- [ ] Analytics installed (cookieless if you want to skip the banner)
- [ ] `sitemap.xml`, `robots.txt`, canonical URLs, OG/Twitter cards on every page
- [ ] Custom domain, HTTPS, `www` → apex redirect, and email deliverability (SPF/DKIM) if you send order mail
- [ ] Backups: content in git, images in a bucket you control, not only on Vercel

---

## 7. Running costs

| Item | Monthly |
|---|---|
| Vercel Pro (required for commercial) | ~$20 |
| Domain | ~€1 |
| Figma Professional, Dev/Full seat — **optional** | ~$16 |
| Stripe | 1.5% + €0.25 per EU card txn |
| Analytics (Plausible/Fathom) | €0–9 |
| Coding agent subscription | varies |

Skipping Figma is the easiest ~$200/year to save if you're building solo.

---

## 8. If this feels like too much

Legitimate alternative: buy a Shopify theme, spend the saved three weeks on **photography and product stories**, and revisit a custom build when you know what sells. A gorgeous photo set on a generic theme outperforms a custom site with mediocre photos, every time. The plan above is worth it when the visual identity is genuinely part of what you're selling — which, for handmade porcelain, it plausibly is.
