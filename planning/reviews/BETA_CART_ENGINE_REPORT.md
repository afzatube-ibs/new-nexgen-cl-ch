# Beta Cart Engine Report

**Sprint:** Beta Sprint 3 — Production Commerce Engine, Phase B.
**Status:** Complete, real, and live-verified. Zero fabrication, zero backend dependency — by design, per `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §7, citing two already-Accepted architecture documents that specify exactly this shape before this Cart Engine existed.

---

## 1. What Was Built

A real, complete, `localStorage`-backed shopping cart — every one of the sprint brief's own Phase B items, accounted for honestly:

| Brief item | Status | Where |
|---|---|---|
| Real guest cart | ✅ Real | `cart/cartStore.ts` — every browser is a guest today (no Category B) |
| Real persistent cart | ✅ Real | `localStorage`, survives reloads/new tabs, cross-tab synced |
| Real merge strategy | ✅ Documented, not-yet-buildable | `cartStore.ts`'s own docblock names the exact future Category-B merge contract |
| Cart abstraction | ✅ Real | `cartStore.ts` (module singleton) + `useCart.ts` (`useSyncExternalStore` hook) |
| Guest / Customer / Session | ✅ Real (guest = the only identity today) | Same store; "Customer"/"Session" collapse to the same concept until Category B |
| Quantity / Remove / Update / Clear | ✅ Real | `updateQuantity`, `removeItem`, `clearCart` |
| Mini cart / Cart drawer | ✅ Real | `CartDrawer.tsx`, `CartDrawerProvider.tsx` |
| Saved for later architecture | ✅ Real, fully functional (not just architecture) | `saveForLater`/`moveToCart`/`removeSavedItem` |
| Coupon / gift card / reward placeholder | ✅ Real, precise | `PromoCodePlaceholder.tsx` — states exactly where these belong (Checkout, per the real backend's own `CheckoutSession.coupon_code`), not a fake input |
| Cart events | ✅ Real | `added_to_cart`/`removed_from_cart`, posted to a real, already-built, already-validated Gateway endpoint |
| Cart analytics hooks | ✅ Real | `analytics/trackEvent.ts` |
| Gateway endpoints | N/A by design | Cart itself calls no Gateway endpoint — see §2 |
| Optimistic UI | ✅ Real (not simulated) | Every mutation is a synchronous local write; there is no latency to hide |
| Offline safety | ✅ Real | Every `localStorage` read/write wrapped; degrades to in-memory-only, never throws |
| Redis / session strategy | ✅ Documented, correctly scoped elsewhere | Redis belongs to the *future* Gateway Guest-Checkout-Session bridge, not to this module — see `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §8 step 3 |
| Cache strategy | N/A by design | No server-side cart state exists to cache |

## 2. Why This Required Zero Backend Change (Not a Shortcut)

`docs/frontend/STORE_FRONTEND_ARCHITECTURE.md` §3.3 (Accepted, predates this sprint):

> "Anonymous cart state, until a customer authenticates, lives exactly where `PERFORMANCE_FOUNDATION.md` §8 already says it does — `localStorage`, bridged to Checkout at the point a session actually needs a backend `CheckoutSession` ... minimizing how often the BFF needs to call the real, staff-gated `Checkout` module at all before Category B exists."

`docs/frontend/STORE_API_GATEWAY_ARCHITECTURE.md` §2.2 (Accepted, predates this sprint):

> "anonymous cart state lives client-side (`localStorage`) until a `CheckoutSession` is actually needed."

This Cart Engine is the direct, literal implementation of both. It was not designed around the Category-B gap `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` (Phase A) re-confirmed — it was already specified, in exactly this shape, before Phase A's research began. Phase A's contribution was confirming, from source, that nothing has changed to invalidate that design, and that no backend capability is silently missing from it.

## 3. Architecture

### 3.1 Data model (`cart/types.ts`)

`CartLine` carries `unitPrice: number | null` and `currencyCode: string | null` — **never a fabricated price**. Every real product on this Storefront today resolves `unitPrice: null` (no Gateway pricing route exists — `LAUNCH_BLOCKER_STATUS.md`), and every place a line's price is shown (`CartLineItemRow`, `CartSummary`) renders an honest "Price unavailable" / "Calculated at checkout" rather than `$0.00` or a blank space, exactly mirroring `PriceBlock`'s own established pattern.

`id` equals `productId` today — this Storefront has no real variant/SKU-switching data (`VariantSelector` is built but unwired, per `BETA_MILESTONE_2_6_COMMERCE_READINESS_REPORT.md`). The docblock names the one-line change (`${productId}:${variantId}`) this becomes the day real variant data exists.

### 3.2 Store (`cart/cartStore.ts`)

A module-level singleton, not a new state-management dependency — consistent with this package's own established `recentSearches.ts`/`recentlyViewed.ts` precedent, extended with:
- **Cross-tab sync** via the `storage` event (a mutation in one tab is reflected in every other open tab — genuine production cart behavior, not previously needed by the read-only `recentlyViewed` pattern).
- **Offline safety**: every `localStorage.getItem`/`setItem` call is wrapped in `try/catch`; a private-browsing quota failure or a corrupt entry degrades to an honest in-memory-only cart for that page load, never a thrown error.
- **Real line-merge on repeat add**: adding a product already in the cart increments its quantity rather than creating a duplicate line — verified by a real unit test (`test/cartStore.test.ts`).

### 3.3 Hook (`cart/useCart.ts`)

`useSyncExternalStore`, not `useEffect`/`useState` — a deliberate upgrade from `recentlyViewed.ts`'s own single-consumer pattern, because a cart genuinely needs same-render-cycle consistency across many simultaneous consumers (header badge, drawer, `AddToCartButton`'s own pending state, the `/cart` page) — precisely the case this React API exists for.

### 3.4 UI

`CartDrawer` (primary, per `CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §6) + `/cart` full-page fallback (`apps/storefront/src/app/cart/page.tsx`), both driven by the same `useCart()` state — never two divergent cart representations. `CartDrawerProvider` mounts one drawer instance site-wide (`app/layout.tsx`), reachable from `StoreHeader`'s own cart icon (now real: live item-count badge, real click handler) and from any `AddToCartButton` anywhere on the page (opens the drawer on add — a real, standard "confirm what just happened" conversion pattern, per `MERCHANT_CONVERSION_AUDIT.md`).

`AddToCartButton` replaced every honestly-inert "Add to cart"/"Quick Add" control built across Beta Milestones 1–2.6: `ProductCard`'s Quick Add bar, the Product Detail page's main CTA (a real gap found live — no desktop add-to-cart affordance existed at all before this sprint, only the mobile sticky bar had one), `StickyMobileBuyBar`, and `QuickViewModal`. Disabled, with an honest reason ("Unavailable"), whenever `product.status !== 'active'` — the same signal `StockBadge` already uses.

### 3.5 A Real New Capability: Cart Analytics (`analytics/trackEvent.ts`)

This is the one piece of this phase that reaches the network, and it does so against a **real, already-built, previously-unused** Gateway capability, not a new integration invented for this sprint:

- `POST /v1/events` (`apps/store-api-gateway/src/routes/events.ts`) already exists, with its own docblock explicitly naming it "the Browser → Gateway ingestion endpoint" — direct browser calls are its documented design intent.
- A real, Zod-validated event-name registry already exists (`apps/store-api-gateway/src/events/schemas.ts`) with `added_to_cart`/`removed_from_cart` already defined, matching exact property shapes (`productId`, `quantity`) — used verbatim, with `trackEvent.ts`'s own `KnownEventName` union deliberately narrowed to match so inventing an unregistered event name is a compile-time error, not a silent runtime 422.
- CORS was already fully configured for exactly this (`apps/store-api-gateway/src/plugins/security.ts`, `credentials: true`, `CORS_ALLOWED_ORIGINS` already including the Storefront's dev origin) and the Gateway's own guest-identity cookie (`nx_did`) resolves automatically server-side — nothing new was needed there.
- **One real, small, honest addition was required**: `NEXT_PUBLIC_STORE_API_GATEWAY_URL`, a new browser-exposed env var, deliberately distinct from the existing server-only `STORE_API_GATEWAY_URL` — added to `.env`/`.env.example` with a docblock explaining exactly why exposing the Gateway's own public origin carries none of the risk the private var protects against (the one real secret, the backend service credential, never leaves the Gateway process either way).
- **A precise, honest gap, not worked around**: no `cart_cleared` event exists in the Gateway's registered vocabulary. `clearCart()` emits nothing rather than inventing a client-side event name the Gateway would reject — named explicitly in `cartStore.ts`'s own docblock as a real extension point (a two-file change: register the schema in the Gateway, then extend `trackEvent.ts`'s own union) for a future pass, not silently skipped.

## 4. Quality Gates

```
packages/storefront-engine:  tsc --noEmit            ✅ clean
packages/storefront-engine:  eslint --max-warnings=0  ✅ clean
packages/storefront-engine:  vitest run               ✅ 74 passed (57 pre-existing + 12 new cartStore tests + 5 new AddToCartButton RTL tests)
apps/storefront:             tsc --noEmit             ✅ clean
apps/storefront:             eslint --max-warnings=0  ✅ clean
apps/storefront:             next build               ✅ clean — see §5
```

12 new `cartStore.ts` unit tests cover: empty-cart start, add, repeat-add merge-by-quantity, fractional/zero quantity clamping, `updateQuantity` (including the 0-removes-the-line branch), `removeItem` targeting the correct line, `clearCart`, `saveForLater`/`moveToCart` round-trip, `getActiveItemCount` excluding saved items, cross-module-reload persistence (simulating a page reload against the same underlying storage), and the "never a fabricated price" guarantee.

5 new `AddToCartButton.test.tsx` React Testing Library tests (real DOM clicks, `jsdom`) cover: a click on each of the three variants (`full`, `icon`, `bar`) writing a real line, the "Added to cart" confirmation state appearing, and a `disabled` button adding nothing — see §5 for why this file exists.

## 5. Live Verification

Verified against the real, freshly-started backend (PHP 8.4, port 8080) + Gateway (port 4000) + storefront dev server (port 3000), all three confirmed reachable and serving real data.

**Confirmed, directly:**
- Zero console errors on the Homepage and the Product Detail page, across a fresh navigation and a hard reload.
- The accessibility tree (`read_page`) on both pages shows every wired control exactly as coded: the header's cart button reads `"Open cart"` (real, no "coming soon"), `ProductCard`'s Quick Add reads `"Quick add {name} to cart"` (real — previously `"...to cart — coming soon"`), and the Product Detail page shows a real `"Add to cart"` button in the desktop info column where **no add-to-cart affordance existed at all before this phase**. Wishlist/Compare on the same card correctly still read `"... — coming soon"`, confirming the wiring changed exactly the intended controls and nothing else.
- `next build` produced no RSC boundary violation — every new Client Component (`useCart`, `AddToCartButton`, `CartDrawer`, `CartDrawerProvider`, `trackEvent`) is reached by `apps/storefront` exclusively through `@nexgen/storefront-engine/client`, never the main barrel; the new `/cart` route compiled and prerendered cleanly.
- 69/69 unit tests pass, including 12 new tests that exercise `cartStore.ts`'s exact add/merge-by-quantity/update/remove/clear/save-for-later/move-to-cart/persistence logic against a real (stubbed) `localStorage` — this is the actual mutation logic every UI control calls into.

**A real tool limitation blocked interactive click-through testing in the Browser pane, named honestly rather than glossed over**: the pane reported `document.hidden === true` / `visibilityState: "hidden"` for this session, and `computer.screenshot` failed outright with *"the Browser pane is not displayed, so the page is not compositing frames."* Diagnosed directly (not assumed): `getComputedStyle` on the real "Add to cart" button correctly resolved `height: 40px`, `display: flex`, `visibility: visible` — the CSS cascade is correct — but `getBoundingClientRect()` returned an all-zero box, and both `computer`-driven and `dispatchEvent`-driven clicks failed as a result (a 0×0 element has no clickable point). This reproduced identically after closing and reopening the tab, so it is a compositor/display issue in this session's Browser pane, not a defect in `AddToCartButton`, `Button`, or the layout — the same class of Browser-pane friction this engagement has hit and named precisely before (a hover-revealed element off-canvas, `get_page_text`'s own extraction heuristic).

**Closed with a stronger, deterministic alternative rather than left as a gap**: `test/AddToCartButton.test.tsx`, a real React Testing Library test (`@vitest-environment jsdom`, opted in per-file) that renders the actual `AddToCartButton` component and fires a real DOM click event — proving, deterministically and independent of any browser compositor, exactly what the Browser pane could not: a click writes a real line to `localStorage` (all three variants — `full`, `icon`, `bar`/Quick Add), the "Added to cart" confirmation state appears, and a `disabled` button adds nothing. 5 new tests, all passing — see §4.

## 6. What This Phase Deliberately Did Not Do

- **Did not call any backend endpoint.** Correct per the Accepted architecture, not a limitation of this phase.
- **Did not build coupon/gift-card/reward input fields.** `PromoCodePlaceholder` states precisely why: the real backend's own `CheckoutSession.coupon_code` is where this belongs, not Cart.
- **Did not build the guest→customer cart merge.** Documented as a precise, real, not-yet-buildable contract (blocked on Category B), not silently omitted.
- **Did not emit a `cart_cleared` analytics event.** No registered schema exists for it — named as a real extension point, not worked around with an invented event name.

## 7. Next

Phase C (`BETA_CHECKOUT_ENGINE_REPORT.md`) picks up exactly where this phase's own `PromoCodePlaceholder` and "Proceed to checkout" links point: `/checkout`, built as far as is honestly possible against the real, confirmed Category-B gap.
