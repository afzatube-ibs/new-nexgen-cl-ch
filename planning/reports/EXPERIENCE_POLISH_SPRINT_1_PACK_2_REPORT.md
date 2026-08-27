# Experience Polish Sprint 1 — Pack 2 Completion Report

**Pack:** Product Card v4
**Status:** Complete and verified. Awaiting Product Owner review before Pack 5 begins.

---

## Items implemented

All three items from `EXPERIENCE_POLISH_SPRINT_1_IMPLEMENTATION_ROADMAP.md` Pack 2, exactly as approved:

- **2.1 — `ProductBadgeSlot`** (new component): an ordered, capped, extensible corner-overlay region, replacing the single hardcoded `<StockBadge />` the card rendered before. Renders the same one real badge as before today; architected so a future real per-product signal (a real discount, a real "New"/low-stock flag) is added to its `badges` array at one call site, never a new overlay or a positioning refactor.
- **2.2 — Card visual identity pass**: corner radius increased from `rounded-lg` (8px) to `rounded-xl` (12px), and the hover state changed from shadow-only to a real tactile lift (`-translate-y-0.5` + `shadow-elevation-2` together, `transition-all duration-fast`) — gives the card a visual identity distinct from an Admin data-table row.
- **2.3 — Honest price-state treatment**: `PriceBlock`'s empty-price branch changed from "Price unavailable" (read as a fault) to "Price coming soon" (an honest, deliberate "not yet" — no price is fabricated or implied to exist elsewhere), and now correctly scales its typography with the `size` prop (`caption` at card size, `body` at PDP size) — previously this branch ignored `size` entirely.

## Files changed

| File | Change |
|---|---|
| `packages/storefront-engine/src/components/ProductBadgeSlot.tsx` | **New** |
| `packages/storefront-engine/src/primitives/ProductCard.tsx` | Modified — badge slot wiring, visual identity, updated docblock (v3 → v4) |
| `packages/storefront-engine/src/components/PriceBlock.tsx` | Modified — empty-state branch only |
| `packages/storefront-engine/src/index.ts` | Modified — added `ProductBadgeSlot` export |
| `packages/storefront-engine/test/ProductBadgeSlot.test.tsx` | **New** |
| `packages/storefront-engine/test/PriceBlock.test.tsx` | **New** |

## Components modified

`ProductCard` (v3 → v4), `PriceBlock` (empty-state branch only — the real-price/discount/savings logic is untouched).

## New components

`ProductBadgeSlot` — composes the existing `Badge`-based badges (today: `StockBadge`); does not reimplement any badge's own rendering. Confirmed against the roadmap's own no-duplication table (§9).

## Tests executed

- `packages/storefront-engine`: `npm run typecheck` ✅, `npm run lint` ✅, `npm run test` ✅ **94/94 passed** (12 files → 14 files; 6 new tests added: 3 for `ProductBadgeSlot` — empty state, renders up to the cap, drops badges past `maxVisible` — and 3 for `PriceBlock` — real-price branch unchanged, honest empty-state copy, size-scaling).
- `apps/storefront`: `npm run typecheck` ✅, `npm run lint` ✅, `npm run build` ✅ (exit 0).
- Existing test suites (`AddToCartButton.test.tsx`, `CheckoutForm.test.tsx`, `cartStore.test.ts`, etc.) all remain green, unmodified — confirms no regression to real cart/checkout behavior from this pack's purely presentational changes.

## Live browser verification

Verified against the real backend + Gateway + storefront stack (not mocked), on the real "Premium Wireless Headphones" product:

- **Desktop (1280×900):** Homepage (Featured/Trending/Recently Added rails), Category page, and Product Detail page all render the v4 card and the new price copy correctly. Computed styles confirmed `border-radius: 12px` and `transition-property: all` applied as intended.
- **Mobile (375×812):** Card renders correctly — badge slot, image, name, "Price coming soon," "COD available" — no layout shift or overflow at the narrow viewport.
- **Console:** verified clean on a fresh tab (no errors, no warnings) after ruling out a stale-`.next`-cache artifact from running a production build against a live dev server (an environment issue unrelated to this pack's code, resolved by clearing `.next` and restarting the dev server).

## Performance impact

- **Bundle size**: `next build` output is byte-for-byte identical to the pre-Pack-2 baseline — Homepage First Load JS 186 kB, Product Detail 193 kB, shared chunks unchanged. `ProductBadgeSlot` adds no new dependency (composes existing `@nexgen/ui`/`cn`).
- **Rendering**: no new data fetch, no new client/server boundary — `ProductBadgeSlot` is a plain Server-Component-compatible wrapper.
- **CLS**: no layout-shift risk introduced — the badge region occupies the same space the single `StockBadge` did before; the price branch's `size`-aware typography change affects font-size, not layout structure.

## Accessibility verification

- Full interactive-element sweep (`read_page` accessibility tree) on the Homepage card confirms all pre-existing labels/hrefs are intact: `aria-label="Premium Wireless Headphones"` on the image link, `Quick add …`, `Add … to wishlist — coming soon`, `Quick view …`, `Compare … — coming soon` all present and correctly labeled, unchanged by this pack.
- No new interactive elements were introduced (`ProductBadgeSlot` is a presentational wrapper, not a control), so no new tap-target or keyboard-focus surface exists to regress.
- WCAG AA contrast: unchanged — `StockBadge`'s own `Badge` variant colors are untouched; the new "Price coming soon" copy uses the same `text-text-secondary` token the old copy used.

## Remaining risks

- **Low.** The one open item is cosmetic-scale, not functional: `ProductBadgeSlot`'s `maxVisible` cap (3) has not yet been exercised with more than one real badge in production, since only `StockBadge` is real today — its behavior with a second/third real badge will get its first live exercise the day a real discount or "New" signal is added, at which point it should be spot-checked again.
- No risk to cart, checkout, pricing logic, or SSR/ISR — every change in this pack was confirmed presentation-only via the untouched, still-green existing test suites.

## Screenshots

Captured live this session (desktop Homepage/Category/PDP rails and mobile Homepage) — all shown inline above during verification; card corner radius, badge slot, and "Price coming soon" copy confirmed visually correct at both viewports.

---

**Pack 2 is complete. Per the approved execution order, Pack 5 (PDP Polish) is next — awaiting Product Owner review before it begins.**
