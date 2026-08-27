# Experience Polish Sprint 1 — Pack 5 Completion Report

**Pack:** PDP Polish
**Status:** Complete and verified. Awaiting Product Owner review before Pack 1 (Homepage Hierarchy) begins.

---

## Implementation summary

All five items from `EXPERIENCE_POLISH_SPRINT_1_IMPLEMENTATION_ROADMAP.md` Pack 5 were implemented, exactly as approved, with the additional Product Owner direction (premium/confident/momentum-building, truthful, Buy Box as the visual focal point) applied throughout. Every change is presentation/composition only — no cart, Buy Now, checkout, Gateway, recommendation, or SSR/ISR logic was touched, and nothing new was fabricated (no fake urgency, ratings, visitor counts, discounts, stock, delivery promises, or trust badges were added — the Buy Box shows only real signals it already had).

- **5.1 — CTA hierarchy.** `BuyNowButton` now renders with `Button`'s own default **primary** (solid, dominant) treatment instead of a hardcoded `secondary`, and is positioned first in the button row. `AddToCartButton` gains a new optional `emphasis` prop (`'primary' | 'secondary'`, default `'primary'` — every other call site is unaffected) and is passed `emphasis="secondary"` at both real call sites that now sit beside a `BuyNowButton`. Result: exactly one dominant purchase action, never two competing ones.
- **5.2 — Stock prominence.** `StockBadge` moved from its own row above the price to immediately above the CTA row — the real signal now sits at the actual decision point.
- **5.3 — Visual rhythm.** The info column is now three explicit, visually separated bands — **Decide** (identity, price, stock, the two real CTAs, COD), **Reassure** (trust card, payment methods, couriers, the honest "more ways to buy" state, share), **Learn** (category context, description, FAQ/shipping/returns) — each band after the first begins with a real `border-t border-border pt-6` rule, making the Buy Box itself the clear, undivided focal point at the top of the page before any reassurance or educational content competes with it.
- **5.4 — Honest placeholder refinement.** "More ways to buy" now uses the same dashed-border, muted-surface treatment this platform's own `PromoCodePlaceholder` already established for a deliberate "coming soon" state (replacing a solid `Card`) — reads as intentional, not unfinished. Copy is unchanged, word for word.
- **5.5 — Buy Now on the sticky mobile bar.** `StickyMobileBuyBar` now renders a compact icon-only `AddToCartButton` (`variant="icon"`, secondary weight) alongside a full, primary `BuyNowButton` — mobile shoppers, who spend the most time on this page, now reach Buy Now without scrolling back to the top.

## Files changed

| File | Change |
|---|---|
| `apps/storefront/src/app/products/[idSlug]/page.tsx` | Modified — CTA order/emphasis, stock badge position, three-band layout, placeholder treatment, updated docblock |
| `packages/storefront-engine/src/cart/BuyNowButton.tsx` | Modified — removed hardcoded `variant="secondary"`, now defaults to `primary`; docblock updated |
| `packages/storefront-engine/src/cart/AddToCartButton.tsx` | Modified — added optional `emphasis` prop (backward compatible; every existing call site unaffected) |
| `packages/storefront-engine/src/components/StickyMobileBuyBar.tsx` | Modified — added `BuyNowButton`, changed `AddToCartButton` to `variant="icon"`; docblock updated |
| `packages/storefront-engine/test/BuyNowButton.test.tsx` | **New** |
| `packages/storefront-engine/test/AddToCartButton.test.tsx` | Modified — 2 new tests for the `emphasis` prop |

No new components were introduced this pack (none were needed — every item was a presentation change to existing components).

## Components modified

`BuyNowButton`, `AddToCartButton`, `StickyMobileBuyBar`. `PriceBlock`, `StockBadge`, `CodAvailableBadge`, `TrustBadge`, `PaymentMethodsRow`, `CourierBadge` are all reused, unmodified.

## Tests executed

- `packages/storefront-engine`: `npm run typecheck` ✅, `npm run lint` ✅, `npm run test` ✅ **99/99 passed** (15 test files; 5 new tests this pack — 3 in the new `BuyNowButton.test.tsx` covering the new primary treatment, the unchanged real add-to-cart-and-navigate behavior, and the disabled state; 2 added to `AddToCartButton.test.tsx` covering the new `emphasis` prop's default and override).
- `apps/storefront`: `npm run typecheck` ✅, `npm run lint` ✅, `npm run build` ✅ (exit 0).
- **Every pre-existing test remains green and unmodified in its assertions** — `CheckoutForm.test.tsx`'s real submission/validation tests, `cartStore.test.ts`, `AddToCartButton.test.tsx`'s original 5 tests — confirming the real cart, Buy Now, and checkout business logic is provably untouched by this pack's presentation-only changes.

## Live browser verification

Verified against the real backend + Gateway + storefront stack, on the real "Premium Wireless Headphones" product:

- **Desktop (1280×900):** Buy Box renders with Buy Now as a solid indigo primary button first, Add to Cart as a muted secondary button second; the Stock badge sits directly above the button row; the Reassure and Learn bands are visibly separated by a rule and extra spacing beneath the Decide band; "More ways to buy" now shows a dashed border. Computed styles confirmed via `getComputedStyle`: Buy Now `background-color: rgb(79, 70, 229)` (brand), Add to Cart `rgb(248, 250, 252)` (surface-subtle) — the intended hierarchy, confirmed programmatically, not just visually.
- **Mobile (375×812):** Full page text confirms the same real order (`In Stock` → `Buy now` → `Add to cart` → `COD available`) in the main content, and the sticky bottom bar renders price/stock, a compact icon Add-to-cart, and a full primary Buy Now, all fitting on one row with no wrapping or overlap.
- **End-to-end flow re-verified, not assumed**: clicked the sticky mobile bar's real Buy Now button — confirmed via `localStorage` that a real cart line was written and the browser navigated to the real `/checkout`, which rendered the real order form. The Buy Now flow is provably unchanged.
- **Console**: clean, no errors, on both viewports.

## Performance impact

- **Bundle size**: `next build` output shows `/products/[idSlug]` First Load JS unchanged at 193 kB, and the route's own page size actually **decreased** slightly (4.66 kB → 4.41 kB) from simplifying the "more ways to buy" markup. Homepage and every other route unchanged (186 kB / 103 kB shared baseline). No new dependency was added.
- **Rendering**: no new data fetch; no Server/Client boundary change (`BuyNowButton` and `AddToCartButton` were already Client Components rendered from this Server Component page, same as before).
- **CLS**: no layout-shift risk — every change is static markup present at first render, not a client-side toggle.

## Accessibility verification

- Full interactive-element and full-page-text sweep confirms every button keeps its correct, real accessible name (`Buy now`, `Add to cart` / `Add {name} to cart` for the icon variant) and real `disabled`/`aria-label` behavior for the out-of-stock case — unchanged from before this pack.
- Keyboard focus order follows the new visual order (Buy Now, then Add to Cart) — both remain fully keyboard-operable with the platform's standard `focus-visible:ring-2 focus-visible:ring-focus` treatment, unchanged.
- WCAG AA contrast: unchanged — both buttons use existing, already-audited `Button` variant colors (`primary`/`secondary`), never a new color.
- **One pre-existing condition noted, not introduced by this pack**: the sticky mobile bar's icon-only Add-to-cart button is 36×36px (`h-9 w-9`), below the 44×44px floor `NEXGEN_STOREFRONT_DESIGN_DNA.md` §15 rule #12 requires. This is the same `icon` variant's existing size wherever it was already used (`ProductQuickActions`) — this pack changed *where* it's used (the sticky bar), not its size. Flagged here for Pack 11 (Accessibility), which owns the sitewide tap-target audit, rather than fixed opportunistically outside this pack's approved scope.

## Risks

- **Low overall.** Every change is confirmed presentation-only via the untouched, still-green existing test suites for cart/checkout logic, and the real Buy Now flow was re-verified end-to-end live, not assumed.
- The tap-target note above is the only open item, explicitly deferred to Pack 11 rather than silently left unrecorded.

## Before / after comparison

**Before this pack:**
- Add to Cart rendered `Button`'s default primary (solid) treatment; Buy Now was hardcoded to `secondary` (muted) — the *lower*-intent action was visually dominant, backwards from the pack's own goal.
- Stock status sat above the price, one full section away from the buttons it should inform.
- The entire info column was one undifferentiated column from title to FAQ disclosures, with no visual signal that the Buy Box was the page's own focal point.
- "More ways to buy" used the same solid-card treatment as every other section, reading as an unfinished feature rather than a deliberate state.
- The sticky mobile bar carried only Add to Cart — a mobile shopper wanting to buy immediately had no Buy Now option without scrolling to the top of the page.

**After this pack:**
- Buy Now is the single, unmistakable dominant action everywhere it appears (desktop Buy Box and the mobile sticky bar); Add to Cart is clearly secondary.
- Stock status sits immediately above the buttons it informs.
- The Buy Box (identity → price → stock → CTAs → COD) is visually distinct and reads first; trust/payment/delivery reassurance and descriptive/FAQ content are clearly separated bands beneath it, never competing with it.
- "More ways to buy" reads as an intentional, honest "coming soon," matching this platform's own established idiom.
- A mobile shopper can complete a real purchase intent (Buy Now → real cart line → real checkout) without ever leaving thumb reach of the bottom of the screen.

Every one of the above was captured live this session (desktop and mobile screenshots, computed-style checks, and a real end-to-end Buy Now click) during verification.

---

**Pack 5 is complete. STOPPING here per instruction — Pack 1 (Homepage Hierarchy) will not begin until Product Owner approval.**
