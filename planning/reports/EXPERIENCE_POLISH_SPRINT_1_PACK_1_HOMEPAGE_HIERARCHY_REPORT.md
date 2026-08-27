# Experience Polish Sprint 1 — Pack 1 — Homepage Hierarchy Report

**Pack:** Homepage Hierarchy
**Status:** Complete and verified. Awaiting Product Owner approval before the next sprint begins.

---

## Objective

Improve the Homepage's visual hierarchy and conversion experience — presentation and section-order only, every business rule preserved, no fake marketing, urgency, reviews, counters, or delivery promises. The homepage should instantly answer what the store sells, why to keep browsing, and where to click next, with the Hero as the page's single strongest visual anchor and each section reading as its own destination.

## Design decisions

1. **The Hero now renders first, alone.** Previously the generic `PromotionBanner` ("New arrivals every week") rendered *above* the Hero in the page's own JSX — undermining the explicit requirement that the Hero be the strongest visual anchor. The Hero is now rendered on its own, first; the banner follows immediately after, restyled to the quieter `tone="subtle"` treatment (was `tone="brand"`, a solid color bar that visually competed with the Hero directly above it).
2. **The Hero gained a real, working CTA.** It previously received no `cta` at all from the homepage. It now links to `#featured-products`, a real in-page anchor on the real Featured Products section rendered further down the same page — not a new route, not a placeholder link, not a fabricated destination. `scroll-mt-24` on the anchor keeps the section clear of the sticky header when scrolled to.
3. **Hero visual weight increased**: `rounded-lg` → `rounded-xl` (matching the corner language already established on Product Card v4, the PDP Buy Box, and Checkout's Order Summary in Packs 2/5/5.5/6), more generous vertical padding (`py-12` flat → `py-14 sm:py-24`), and slightly more internal rhythm (`gap-3` → `gap-4`). Same real heading/subheading copy — nothing rewritten, no new marketing text.
4. **Section order now follows the Product Owner's exact specified flow**: Hero → Featured Products → Categories → Trending/Recently Added/Brands (the real secondary discovery rails, standing in honestly for "Featured Collection" — real Collections still cannot list their own member products, a pre-existing, documented backend gap, so nothing was built or faked to satisfy that literal label) → Trust → Newsletter → Footer. This required only reordering the `homepageSections` array in `theme/defaultTemplates.ts` — the exact, sanctioned extension point `THEME_ENGINE_ARCHITECTURE.md` §6 names for tuning a Template's default arrangement. Same eight real sections, same real Gateway data, zero new fetches.
5. **Inter-section spacing increased** (`gap-12` → `gap-16` on the homepage's own root) so each section reads as its own destination through whitespace alone — no new dividers, no background zebra-striping, per `NEXGEN_STOREFRONT_DESIGN_DNA.md`'s "whitespace does the persuading, restraint over decoration" principle.
6. **Product/category/brand rail spacing increased** (`gap-4` → `gap-5` inside `ProductGrid`, `CategoryGrid`, and `BrandSlider`'s own grids/scroll rails) for more breathing room between cards — `ProductCard` itself was not touched, exactly as instructed ("do not redesign ProductCard, reuse v4").
7. **Consistent `rounded-xl` corner language** extended to `CategoryGrid` tiles, `BrandSlider` tiles, `TrustBar`, and `Newsletter` (all were `rounded-lg`) — one coherent premium corner language across the whole page, matching every other pack this sprint.
8. **`TrustBar` and `Newsletter` padding increased** (`p-6`→`p-8`, `py-10`→`py-14`) for more generous, premium breathing room on the two sections closing out the page.

No product was hardcoded, no component was duplicated, and nothing was added that isn't backed by real data already flowing through this page's own three existing `Promise.all` Gateway calls.

## Files changed

| File | Change |
|---|---|
| `apps/storefront/src/app/page.tsx` | Modified — Hero/PromotionBanner render order, real Hero `cta`, `#featured-products` anchor, `gap-16`, updated docblock |
| `packages/storefront-engine/src/theme/defaultTemplates.ts` | Modified — `homepageSections` reordered |
| `packages/storefront-engine/src/primitives/Hero.tsx` | Modified — radius/padding/rhythm only |
| `packages/storefront-engine/src/primitives/ProductGrid.tsx` | Modified — grid gap only |
| `packages/storefront-engine/src/primitives/CategoryGrid.tsx` | Modified — grid gap + tile radius |
| `packages/storefront-engine/src/primitives/BrandSlider.tsx` | Modified — rail gap + tile radius |
| `packages/storefront-engine/src/primitives/TrustBar.tsx` | Modified — radius + padding |
| `packages/storefront-engine/src/primitives/Newsletter.tsx` | Modified — radius + padding |

No new components were introduced. No test file required modification — the existing suite (`defaultTemplates.test.ts`, `renderSections.test.ts`) asserts section-resolution *behavior*, never a specific order or class name, so it remained valid and green without changes.

## Tests executed

- `packages/storefront-engine`: `npm run typecheck` ✅, `npm run lint` ✅, `npm run test` ✅ **100/100 passed**, unmodified — including `defaultTemplates.test.ts` (confirms the homepage Template still resolves to a real, non-empty section arrangement) and `renderSections.test.ts` (confirms `Hero` still resolves correctly as a registered primitive).
- `apps/storefront`: `npm run typecheck` ✅, `npm run lint` ✅, `npm run build` ✅ (exit 0).

## Desktop verification

- Live-verified against the real backend + Gateway stack. Screenshot confirms: Hero renders first (rounded, padded, with a real "Shop now" primary button), the now-subtle `PromotionBanner` immediately after, then Featured Products, Shop by category, Trending now, Recently added, Trust, Newsletter, Recently viewed, and the Footer — the exact requested flow.
- Confirmed programmatically via `getComputedStyle`: Hero `border-radius: 12px`, Hero `padding-top: 96px` (the new `py-24`), "Shop now" `href="#featured-products"`, and the `#featured-products` anchor element exists in the DOM.
- Semantic heading check: exactly one real `<h1>` ("Welcome to the store"), followed by six real `<h2>`s in the new page order (Featured products, Shop by category, Trending now, Recently added, Stay in the loop, Recently viewed) — a clean, correct outline structure, unchanged in kind, reordered in position.
- Console clean on a freshly opened tab (a stale, pre-existing `/v1/events` `422` from an earlier, unrelated verification session was ruled out by confirming zero errors on a brand-new tab — this platform's own analytics-beacon endpoint condition, not something this pack touched or introduced).
- Spot-checked the Category page (which reuses the same `ProductGrid`/`CategoryGrid` components this pack modified) — renders correctly, console clean, confirming the shared-component spacing/radius changes didn't regress that page.

## Mobile verification

- **375×812**: Hero, its CTA, and a peek of the next section all sit comfortably in the first viewport — a clear, strong first impression without the Hero consuming the entire screen. Scrolled the full page: Featured products → Shop by category → Trending now → Recently added → Trust (2×2 icon grid) → Newsletter → Recently viewed → Footer, all in the correct order, no wrapping or clipping anywhere.
- **No horizontal overflow**: confirmed programmatically (`document.documentElement.scrollWidth === window.innerWidth === 375`).
- **No console errors** at any point during the mobile scroll-through.
- Newsletter's email input and Subscribe button, the Trust icons, and the Footer's payment/courier rows (already refined in Pack 5.5) all remain fully legible and correctly spaced at this width.

## Accessibility verification

- Heading hierarchy is a single, correct outline (one `h1`, all sections `h2`) — unchanged in structure, only in order, which now matches the actual visual/reading order of the page (a real improvement: heading order and visual order were already aligned, and remain aligned after the reorder).
- The new Hero CTA is a real `<a href="#featured-products">` — fully keyboard-reachable, and native in-page anchor navigation requires no JavaScript and needs no ARIA beyond its own real link text ("Shop now" — a genuine label, not "click here").
- No new interactive elements were introduced beyond that one real anchor link; every other control on the page is unchanged.
- WCAG AA contrast: unchanged — no new color was introduced anywhere in this pack, only spacing, radius, and section order.

## Performance impact

- **API calls**: unchanged — still exactly the same three `Promise.all` Gateway calls (`getHomepage`, `getProducts`, `getRecommendations`) this route already made. No new fetch was added anywhere, including for the Hero's own CTA (a same-page anchor, not a route).
- **Client JS / hydration**: unchanged — every component touched in this pack is a Server Component (`Hero`, `ProductGrid`, `CategoryGrid`, `BrandSlider`, `TrustBar`); none gained new client-side state or a new `'use client'` boundary.
- **Layout shift**: none — every change is static markup/spacing present at first paint; the homepage route remains `○` (Static/ISR) in the production build output, exactly as before this pack (confirmed directly in the build log, not assumed).
- **Bundle size**: First Load JS for `/` is unchanged at 186 kB, identical to the pre-Pack-1 baseline from every prior pack's own build output this sprint.

## Risks

- **Low.** Every change is confirmed presentation/composition-only via the untouched, still-green test suite, and the production build confirms the homepage's own rendering mode (Static/ISR) and bundle size are both unaffected.
- The "Featured Collection" step in the Product Owner's own requested flow diagram is honestly represented by the real Trending/Recently Added/Brands rails rather than a literal, separately-branded "Collection" section — real Collections still cannot list their member products (a pre-existing, named backend gap, unchanged and untouched by this pack) — named here plainly rather than worked around with invented data.

## Before / after summary

**Before this pack:**
- A generic promotional banner rendered *above* the Hero, undermining the Hero's own visual primacy.
- The Hero had no call-to-action at all.
- Section order was Hero → Categories → Featured → Trending → Recently Added → Brands → Trust → Newsletter — Categories preceded Featured, opposite of the Product Owner's intended "what we sell first" flow.
- Every section used the same `rounded-lg`/`gap-4`/`p-6`-scale spacing as a plain data list, with no particular sense of rhythm or destination.

**After this pack:**
- The Hero is unambiguously the page's first, strongest, most visually confident element — larger, more rounded, more generously padded, with a real, working "Shop now" CTA.
- The page flows exactly as specified: Hero → Featured → Categories → secondary discovery rails → Trust → Newsletter → Footer.
- Every section shares one consistent, premium `rounded-xl` corner language and more generous internal/inter-section spacing, so the page reads as a series of clear, calm destinations rather than one undifferentiated scroll.

---

**Pack 1 — Homepage Hierarchy is complete. STOPPING here per instruction — no further pack begins until Product Owner approval.**
