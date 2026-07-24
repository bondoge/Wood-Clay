# MOTION-SPEC.md — Wood&Clay

The complete, closed inventory of animation on this site. If a motion isn't in this document, it doesn't get built — ask instead of inventing.

**Governing principle: motion imitates the brush, never the browser.** Everything is a stroke being drawn, a petal opening, a wash spreading into glaze. Nothing bounces, springs, or slides in from off-screen. No `cubic-bezier` with overshoot, anywhere.

---

## 0. The one technique that does most of the work

Every ornament effect in this brief — the unrolling ornaments, the brushstroke buttons, the painting flowing off the figurine — is **the same technique**: revealing an SVG path with `stroke-dasharray` / `stroke-dashoffset`.

```css
.ornament path {
  stroke-dasharray: var(--len);
  stroke-dashoffset: var(--len);   /* fully hidden */
}
/* animate dashoffset → 0 and the path draws itself, in stroke order */
```

Because the path is drawn **in the direction the illustrator drew it**, it reads as a brush moving. This is why the asset requirement in `PLAN.md` §4a is non-negotiable: paths must be drawn in brush direction, single continuous where possible.

For filled ornaments (Zhostovo bouquets, which are painted mass, not line) the equivalent is a **mask whose gradient stop position animates** — the paint spreads instead of the line drawing.

Learn this one thing and the rest of the document is variations.

---

## 1. Browser support and the fallback contract

Scroll-driven CSS animations: **Chrome/Edge 115+ and Safari 26 have full support; Firefox still has it behind `layout.css.scroll-driven-animations.enabled` as of Firefox 152 (June 2026)**, so it is not Baseline — global support sits around 82%.

For Russia this is comfortable: Yandex Browser is Chromium, and iOS Safari is on 26. Firefox share is negligible.

**The failure mode is "no animation", not "broken page"** — an unsupported browser ignores `animation-timeline` entirely. So:

```css
/* Default = the FINISHED state. Always. */
.ornament { opacity: 1; stroke-dashoffset: 0; }

@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .ornament {
      animation: draw linear both;
      animation-timeline: view();
      animation-range: entry 10% cover 40%;
    }
  }
}
```

**Rule, absolute:** the static default is always the completed state. Never author "hidden by default, revealed by JS/CSS" — a Firefox user or a reduced-motion user must never see an empty page. This single rule prevents the most common and most damaging bug class in scroll-animated sites.

No JS scroll listeners. If `animation-timeline` can't express it, use IntersectionObserver to toggle a class — never a `scroll` event handler.

---

## 2. The inventory

Nine motions. That's all of them.

### M1 · `ornament-draw` — the unrolling ornament
**Where:** hero ornament, section dividers, corner flourishes.
**How:** `stroke-dashoffset` → 0, scroll-driven via `animation-timeline: view()`.
**Duration:** scroll-bound, `animation-range: entry 10% cover 40%`.
**Easing:** `linear`. Scroll-driven motion must be linear — the user's scroll provides the easing, and adding more makes it feel laggy.
**Cost:** cheap. Compositor-friendly if the path count is sane.
**Budget:** ≤3 simultaneously in one viewport, ≤40 anchor points per path.

### M2 · `bouton-unfurl` — the flower opening
**Where:** the **primary** CTA of a page. **One per page.** This is the expensive one.
**How:** 6–8 petal paths sharing a transform origin at the bud centre. Staggered `scale(0.2 → 1)` + `rotate(−12deg → 0)` + `opacity`, 40ms stagger, outer petals last.
**Trigger:** press/tap on the CTA, and once on hero load.
**Duration:** 520ms total including stagger.
**Easing:** `cubic-bezier(0.22, 0.61, 0.36, 1)` — decelerating, no overshoot. A petal does not bounce.
**Fallback:** if a true morph is needed rather than layered petals, use **Lottie** (bodymovin export) — but only for this one motion, loaded dynamically on the pages that use it. Do not add Lottie for anything else.
**Budget:** one instance per page. Not on secondary buttons. Not on cards.

### M3 · `brush-underline` — the brushstroke button
**Where:** all CTAs, all text links. **This replaces the floral button frames in the moodboards** — those don't survive Russian label lengths or 390px width, and they can't be made accessible.
**How:** an SVG stroke behind the label, `stroke-dashoffset` → 0, left to right, with a tapered path so it reads as a loaded brush lifting.
**Trigger:** `:hover`, `:focus-visible`, `:active`.
**Duration:** 260ms.
**Easing:** `cubic-bezier(0.4, 0, 0.2, 1)`.
**Colour:** `--accent` of the active theme — cobalt on Gzhel, cinnabar on Khokhloma, gold on Zhostovo. Same component, four colours, zero forks.
**Cost:** trivial. Use freely.

### M4 · `ornament-overflow` — **the signature**
**Where:** style page hero. **Once per page. Never anywhere else.**
**How:** the hero photograph sits on top; an SVG ornament layer sits behind and around it, with paths whose origin coordinates land exactly on a painted flower on the object. On load, the first segment draws outward from that point; on scroll, subsequent segments continue across the page ground. The object's pattern becomes the page's pattern.
**Composition:** requires the ornament SVG to be authored **against the specific hero photograph** — this is a per-page illustration job, not a reusable asset. Budget one per style page.
**Trigger:** load (first 30%) then `animation-timeline: view()` for the rest.
**Duration:** 900ms on load, remainder scroll-bound.
**Budget:** one per page, ≤6 paths, ≤24 KB total.

### M5 · `wash-spread` — the Gzhel gradient
**Where:** Gzhel theme only, section backgrounds and image reveals.
**How:** a mask with an animated radial/linear gradient stop, so cobalt washes outward and fades — reproducing «мазок с тенью», the loaded stroke grading to transparent.
**Duration:** scroll-bound.
**Note:** on the Gzhel theme this **replaces all ordinary CSS gradients.** No generic linear-gradient anywhere on that theme.

### M6 · `parallax-set` — depth in the hero composition
**Where:** hero compositions only (shelf, fir branch, object).
**How:** 2–3 layers, `transform: translate3d()` only, driven by `animation-timeline: scroll()`.
**Amplitude:** **±16px maximum.** Anything more looks like a template.
**Disabled below 1024px** — parallax on a phone costs battery and gains nothing.
**Never** parallax the LCP image in a way that delays its paint.

### M7 · `reveal` — everything else
**Where:** all ordinary content blocks.
**How:** `opacity 0 → 1`, `translateY(8px → 0)`.
**Duration:** 400ms. **Stagger:** 60ms, max 4 items — never stagger a whole grid.
**Boring on purpose.** This is the default; if a block doesn't have a specific reason to use M1–M6, it uses M7.

### M8 · `theme-transition` — crossing between worlds
**Where:** navigating Главная → Гжель, or between style pages.
**How:** View Transitions API, cross-fading the theme token values. Progressive enhancement — unsupported browsers just navigate.
**Duration:** 320ms.
**Why it matters:** it makes the four themes feel like rooms in one house rather than four different websites.

### M9 · `turntable` — flagship pieces only
**Where:** «фигурка месяца» and flagship product pages.
**How:** 24-frame AVIF sprite, scrubbed by drag or scroll. ~400 KB, **loaded only on interaction**, never eagerly.
**Why not gaussian splatting:** your instinct was right. A splat is several MB and needs WebGL; this gets ~80% of the effect at ~5% of the weight.
**Budget:** 3–5 pieces on the whole site.

---

## 3. Per-page budget

Hard limits. An agent exceeding these should stop and ask.

| | Max per page |
|---|---|
| M2 `bouton-unfurl` | 1 |
| M4 `ornament-overflow` | 1 |
| M9 `turntable` | 1 |
| M1 `ornament-draw` | 3 per viewport |
| M6 `parallax-set` | 1, desktop only |
| M3, M5, M7 | unlimited |
| Total inline ornament SVG | 60 KB per page |

**Corporate page (`/korporativnye-podarki`) is exempt from ornament entirely.** M3 and M7 only. It is a sales document, and a procurement manager comparing three suppliers on a work laptop wants clarity, not choreography.

---

## 4. Mobile

**The ornament ambition is a desktop ambition.** At 390px, side ornaments have nowhere to live. Plan each one explicitly rather than letting them break:

| Desktop | Mobile (<768px) |
|---|---|
| M1 side ornaments | Drop. Keep one horizontal divider ornament. |
| M4 signature overflow | Keep, redrawn vertically — it's the signature and it should survive |
| M6 parallax | Off |
| M9 turntable | Keep, drag to rotate — works better by touch than by mouse |
| M2 bud unfurl | Keep |

Ornaments that only work at one width need a separate mobile artwork from the illustrator. Specify this in the commission, or you'll discover it in November.

---

## 5. Performance rules

- No animation on `width`, `height`, `top`, `left`, `margin`. Only `transform`, `opacity`, `stroke-dashoffset`, and mask positions.
- `will-change` only on currently-animating elements, removed after — a permanent `will-change` on twelve ornaments will eat memory on a mid-range Android.
- Inline ornament SVGs so paths are animatable; SVGO them; ≤8 KB each.
- Ornaments below the fold are `content-visibility: auto`.
- **Never animate the LCP element.** The hero photograph paints; the ornament animates around it.
- Verify on a throttled mid-range Android profile, not just on a laptop.

## 6. Accessibility

- Every motion sits behind `@media (prefers-reduced-motion: no-preference)`, with the finished state as the default.
- Decorative ornaments: `aria-hidden="true"`, not focusable, no `<title>`.
- M3 must never be the *only* focus indicator — a real focus ring is required alongside it, contrast-checked against `--ground` on each of the four themes.
- No motion triggered purely by hover on touch devices.
- M9 turntable needs keyboard controls (arrow keys) or a static gallery fallback.

## 7. Definition of done for any motion work

1. Works with `animation-timeline` unsupported (Firefox) — content fully visible.
2. Works with `prefers-reduced-motion: reduce` — content fully visible, in its final state.
3. Screenshots at 390 and 1440, on every affected theme, taken and looked at.
4. Within the §3 budget.
5. Profiled: no layout thrash, no dropped frames on a throttled mobile profile.
