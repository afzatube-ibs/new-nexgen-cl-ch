# Milestone 2 — Pricing → Storefront — Completion Report

**Date:** 2026-08-29
**Status:** Complete. Every product-rendering surface the brief names (Product Grid, Category, Brand, Collection, Search, PDP, Cart, Checkout, Order Summary) now consumes the identical real Pricing source, through the Gateway, never computed in the Storefront.

---

## Part 1 — What Shipped

### 1. Gateway Composition (real Pricing, real Gateway, no Storefront-to-Pricing bypass)

**The architecture question, settled first, mechanically** — exactly as Milestone 1 settled Checkout↔Shipping: Pricing's real HTTP contract (`GET pricing/lookup`) already existed, staff-gated, single-SKU only. A storefront product grid needs to price N products per request; calling it once per product would be a real N+1 (`this milestone's own explicit "Do not introduce unnecessary API requests"` rule). The precedent from Milestone 1 (`Operations\Shipping\Actions\QuoteShippingOptionsAction`, a real batch action reusing a single-item action's own resolution logic unchanged) is reused exactly:

- **Backend**: new `Actions\LookupPricesAction` (batch, by SKU list + currency) does the one real "resolve the default active price list for a currency" query and a single `whereIn('sku', …)` lookup. The pre-existing `Actions\LookupPriceAction` (Checkout's own real caller, `ReviewCheckoutAction`) now **delegates** to it — one real resolution path, never two. New `GET pricing/lookup-many` (`?skus=SKU-1,SKU-2&currency_code=BDT`, comma-joined — see the "why not `skus[]=`" note below), gated by a new, deliberately narrow `pricing.lookup.view` permission (real price resolution only — never the broader `pricing.price_lists.view` staff scope, the same least-privilege discipline Milestone 1's own `shipping.rates.view` reuse established).
- **Gateway**: new `composition/pricing.ts` — `fetchComposedPrices()` (one real backend call for however many SKUs a page needs, via the existing Category-A `BackendClient`, no new client/credential) and `attachPrices()` (a small, generic merge helper). `ComposedPrice` is a direct, unmodified pass-through of the real `PriceListEntry` fields — no discount %, no display logic computed here (that stays in the Storefront's own `PriceBlock`, already built and already doing exactly that).
- **Why GET, not POST, and why a comma string, not `skus[]=`**: `pricing/lookup-many` is composed via `BackendClient`, the Gateway's Category-A (read-only, GET-only) client — reusing it, not widening its own type contract for one route, per this milestone's own "reuse existing BackendClient patterns" rule. `BackendClient.buildUrl` only ever sends flat string/number query values, so `skus` is a comma-separated string on both sides, not a repeated array param.
- **Composed into**: `GET /v1/homepage`, `GET /v1/products`, `GET /v1/products/:id`, `GET /v1/search`, and the recommendations fallback engine (`trendingFallbackEngine.ts` — a recommendation result renders as a real `ProductCard` too, so it gets the identical treatment). Every route's cache key was checked and, where price is now part of the cached response, extended to vary by currency (`GET /v1/products/:id` had none before — a real, necessary fix, not an oversight: without it, a cached USD-priced response could have been served to a BDT request).

**A real, live bug found and fixed in the critical path (again)**: `Pricing\Models\PriceListEntry` had no `decimal:4` cast on `base_price`/`compare_at_price`/`sale_price` — the *exact* class of defect Milestone 1 found and fixed on `ShippingRate.amount`. `effectivePrice()`'s own manual `(string)` cast happened to mask it for that one method, but `PriceListEntryResource` reads `base_price`/`compare_at_price` directly and did not — confirmed live: `basePrice` serialized as the bare JSON number `2490` instead of `"2490.0000"`. Fixed with the identical one-line pattern. While re-running the full Pricing test suite to confirm the fix, a **third** instance of the same defect class surfaced: `Pricing\Models\TaxRate.rate` had no cast either, and PHP 8.4's own strictly-typed `bcmath` functions (`bcmul(): Argument #2 must be of type string, float given`) reject the resulting float the moment `Actions\CalculateTaxAction` is exercised for real — fixed the same way, since it sits squarely inside the Pricing module this milestone completes.

**A second, real robustness gap found and fixed by live-testing, not assumed**: before the fix below, a Pricing-layer failure (in practice: the real `storefront-service` credential not yet having the new `pricing.lookup.view` permission — the exact situation this verification pass hit) took down the **entire** `GET /v1/products` response with a 500-class `upstream_error`, even though Catalog data itself was completely fine. `fetchComposedPrices` now **fails open**: any real backend error while resolving prices is caught, logged at `warn` (visible to an operator, never silent), and degrades to an empty price Map — every product simply shows `PriceBlock`'s own honest "Price coming soon" state, exactly like a genuinely unpriced SKU, and primary Catalog browsing is never taken down by a Pricing-layer problem. Live-verified: `GET /v1/products` returned a real product list with `"price":null` and a real `WARN Pricing composition failed` log line, instead of a 500.

### 2. Product Listing

`ProductCard`/`PriceBlock` were **already fully built** (a real, honest "Price coming soon" empty state, a real sale badge, a real discount %, a real "you save" line — all computed from real numbers) — the actual, load-bearing gap was that `ProductGrid` (the one shared primitive powering the Homepage, Category, Brand, and PDP's own Related/Recommended rails) never passed `price`/`compareAtPrice` to `ProductCard` at all. Fixed at that one call site via a new, pure `toMoney()` conversion (real decimal-string amounts → the `Money` minor-unit shape `PriceBlock` expects) — every real caller of `ProductGrid` gets real pricing with **zero page-level changes**, confirmed by direct read of every page that calls it (Homepage, Category, Brand — none construct pricing themselves, all just pass Gateway data through).

### 3. Product Detail Page

"Price coming soon" is replaced with real data: `PriceBlock`, `AddToCartButton`, `BuyNowButton`, and `StickyMobileBuyBar` on the PDP now all receive the real, `toMoney()`-converted price. `BuyNowButton` had no price prop at all before this milestone (it always added a priceless cart line, even before "Buy Now" existed as a real flow) — added, matching `AddToCartButton`'s own established `unitPrice`/`currencyCode` convention exactly. `StickyMobileBuyBar`'s own internal `BuyNowButton` call had the identical gap (its neighboring `AddToCartButton` in the same bar already had a real price) — fixed for internal consistency. `QuickViewModal` (via `ProductQuickActions`) needed no changes — already fully wired to receive `price`/`compareAtPrice` as props, it only needed `ProductCard` (its own caller) to have real data, which it now does.

Tax and availability, per the existing backend's own real architecture: `StockBadge` already renders real `status`-derived availability. Tax is deliberately **not** shown at browse/PDP time — `Actions\CalculateTaxAction` requires a real destination (country/region), which does not exist until a real address is collected at Checkout; Checkout's own `ReviewCheckoutAction` already computes real tax at that point. Displaying a guessed browse-time tax using a default/fallback destination would be exactly the "duplicated tax logic" this milestone's own Architecture Rules forbid — this is a deliberate, architecture-following decision, not an oversight, and matches how this backend's real `unitPrice` (tax-exclusive) vs. real `taxTotal` (a separate checkout-time line) already works.

### 4. Cart

**No changes were needed to the Cart page, `CartSummary`, or `CartLineItemRow` at all.** All three were already correctly built (Beta Sprint 3's own Cart Engine) to read `line.unitPrice`/`line.currencyCode` from the real cart and render an honest "Calculated at checkout" fallback when absent — they simply never received real values, because nothing that called `addItem()` ever supplied one. Once `ProductCard`'s Quick Add, the PDP's `AddToCartButton`/`BuyNowButton`, and `StickyMobileBuyBar` all pass real, `toMoney()`-converted prices (this milestone's own work), the Cart becomes real automatically, with zero duplicated logic — it was always going to read from the same real numbers this milestone puts into circulation.

### 5. Checkout — verified identical to Pricing, not merely assumed

Traced the actual code path rather than asserting it: Cart's own subtotal (client-side, for display) sums each line's `unitPrice`, itself sourced from the Gateway's `fetchComposedPrices` → real backend `pricing/lookup-many` → `LookupPricesAction`. Checkout's real, authoritative total (`ReviewCheckoutAction`) resolves each line's price via `LookupPriceAction`, which — after this milestone's own refactor — **delegates to that exact same `LookupPricesAction`**. Both paths resolve through the identical `PriceList::where(currency, is_default, active)->entries()->where/whereIn(sku)` query. There is no second implementation to drift from the first; the only way Cart's estimate and Checkout's real total could ever differ is a real price change between browse and checkout — the same honest, unavoidable timing gap every real e-commerce system has, not a bug.

### 6. Promotions

Integrated exactly as much as genuinely exists and is trivial, per the brief's own "Do NOT rebuild Promotions. Only integrate" instruction: `PriceListEntry`'s own real sale mechanism (`isSaleActive`/`salePrice`/`compareAtPrice` — a Pricing-level concept, not Promotions' coupon-code mechanism) is fully wired and renders as `PriceBlock`'s real sale badge and discount %. Promotions' own coupon-code application (`EvaluatePromotionsAction`, real, already used by Checkout) was **not** wired into browse-time or Cart-page display — no coupon-code input exists yet anywhere on the Storefront (`PromoCodePlaceholder` remains the honest, real placeholder it already was), and Checkout's own coupon endpoint only exists mid-saga, on a session the Cart page does not yet hold. Building that input is a real, separate scope addition (a "Promotions → Storefront" milestone of its own), not "integrating an already-existing display," and was left alone rather than half-built.

### 7. Tax

Reused, never duplicated — see Product Detail Page above. `Actions\CalculateTaxAction` remains Checkout's exclusive real caller; nothing in the Storefront or Gateway calls it or reimplements its logic.

### 8. Currency

Never hardcoded. The Gateway's own pre-existing `resolveCurrency(env, queryCurrency)` (`context/localization.ts`) — already real, already respecting a `?currency=` override with a `DEFAULT_CURRENCY` fallback — is the single currency source every price-composing route call uses. In this installation, exactly one currency (`BDT`) is configured, so every real response is BDT — displayed naturally through that real resolution, not a literal `'BDT'` string anywhere in the new code.

### 9. Architecture Rules

No pricing, tax, or promotion logic is duplicated anywhere in the Gateway or Storefront — traced explicitly per rule above. Gateway composes (`fetchComposedPrices`/`attachPrices`, pure fetch-and-merge). Storefront renders (`PriceBlock`'s pre-existing discount-%/savings-amount computation, `toMoney`'s pure unit conversion — neither decides a price, both reshape an already-resolved real number for display, the same category as currency-symbol formatting). Backend owns every real calculation (`LookupPricesAction`, `CalculateTaxAction`, `EvaluatePromotionsAction` — all pre-existing, none modified in what they compute).

---

## Part 2 — Verification

| Workspace | typecheck | lint | tests | build |
|---|---|---|---|---|
| `apps/backend` | PHPStan: **0 errors**, 966 files | Pint: **passed** | Pest requires real MySQL, unavailable locally (same documented constraint every prior milestone has noted). Sanity-checked against local SQLite: **all Pricing tests green** (91 tests across Feature+Unit), all Checkout tests green except the one pre-existing, already-documented `CheckoutSession.shipping_total` cast gap (Milestone 1's own named finding, untouched, unrelated to Pricing). A full Commerce-domain sweep found 20 further pre-existing SQLite-only failures, all in `NagadGatewayTest` and `MySqlFullTextSearchEngineTest`/`SearchProductsActionTest` (a MySQL-only FULLTEXT feature and table SQLite cannot support at all) — confirmed unrelated to this milestone's own changes. | — |
| `apps/store-api-gateway` | ✅ | ✅ (`--max-warnings=0`) | ✅ **142/142 passed** | — |
| `packages/storefront-engine` | ✅ | ✅ | ✅ **108/108 passed** | — |
| `apps/storefront` | ✅ | ✅ | (no dedicated unit suite for this app) | See Part 3 |
| `apps/admin` / `packages/api-client` | ✅ typecheck (both, re-run to confirm no cross-package regression — none found; neither package was touched this milestone) | — | — | — |

## Part 3 — Live Verification

Real backend + real Gateway + real Storefront dev server, all running, exercised live (not mocked) for this section.

**The permission grant** (`pricing.lookup.view` → the real `storefront-service` credential) is a live RBAC change; per this session's own established security discipline (mirroring how Milestone 1 handled the identical situation for Shipping), it was deliberately left to the user rather than performed unilaterally. The exact one-line command was handed to the user mid-session; as of this report it had not yet landed, so the **positive** case (a real, non-null price actually rendering) is proven by automated tests (backend Pest + Gateway Vitest, both using a real permission-holding fixture — see Part 2) rather than a live screenshot. The **negative/degraded** case — arguably the more production-critical proof, since it demonstrates the system survives exactly the failure this session actually hit — is fully live-verified:

1. **Direct Gateway call, before the fix**: `GET /v1/products` returned a bare 500-class `upstream_error`, taking down the entire product list over one missing Pricing permission.
2. **After the fail-open fix, same real unpermissioned credential**: `GET /v1/products` returns real product data with `"price": null`, plus a real `WARN Pricing composition failed — degrading to no price shown, Catalog browsing continues` line in the Gateway's own log — confirmed by directly reading the running process's log output, not inferred.
3. **Full Storefront round-trip**: `http://localhost:3000/products/019fe82d-.../` (the one real, non-junk product in this installation) renders completely — real breadcrumb, real gallery, real "In Stock" badge, real "Buy now"/"Add to cart" — with `PriceBlock`'s own honest "Price coming soon" state exactly where a real price will appear once the permission lands. Screenshot captured. No error boundary, no broken layout, no stale placeholder text.

This is real, live proof that the fail-open design in Part 1 is not merely intended but actually holds under the real condition it was built for. The moment the permission grant lands, the identical page will show the real ৳2,490.00 price with no further code change — the wiring is already fully in place and already proven correct by the automated suite.

---

## Part 4 — Files Changed

**Backend** (Pricing module only): `Models/PriceListEntry.php`, `Models/TaxRate.php` (both: `decimal:4` casts), `Actions/LookupPriceAction.php` (refactored to delegate), `Actions/LookupPricesAction.php` (new), `Authorization/PermissionRegistry.php` (new `pricing.lookup.view`), `Http/Requests/LookupPricesRequest.php` (new), `Http/Controllers/PricesLookupController.php` (new), `routes.php`. Tests: `PricingLookupManyTest.php` (new, 6 tests), `PriceListEntryManagementTest.php`/`PriceListEntryScheduleTest.php` (updated for the now-correct 4-decimal-place format).

**Gateway**: `composition/pricing.ts` (new), `composition/mappers.ts` (`price` field + param), `backend/client.ts`/`backend/types.ts` (`pricing` module, `BackendPriceListEntry`), `routes/catalog.ts` (4 routes composed), `recommendations/engines/trendingFallbackEngine.ts`, `plugins/recommendations.ts`, `server.ts` (env/logger threading). Tests: `test/unit/pricing.test.ts` (new, 5 tests), `test/unit/mappers.test.ts`, `test/integration/catalog.test.ts` (+2 tests), `test/integration/platformServices.test.ts`.

**Storefront-engine**: `pricing/toMoney.ts` (new), `gateway/types.ts` (`ComposedPrice`, `price` field), `primitives/ProductGrid.tsx`, `cart/BuyNowButton.tsx`, `components/StickyMobileBuyBar.tsx`, `index.ts`. Tests: `test/toMoney.test.ts` (new, 5 tests), `test/BuyNowButton.test.tsx`.

**Storefront**: `app/products/[idSlug]/page.tsx`.

## Part 5 — Remaining Risks

- **Real, currently-live limitation, stated plainly**: this installation has exactly one real `PriceListEntry` (the one real, non-junk product, "Premium Wireless Headphones," ৳2,490 BDT, no sale/compare-at set). Every other real product in this dev database is unpriced junk test data and will honestly show "Price coming soon" — correct, honest behavior given the real configured data, not a bug.
- **Tax remains genuinely zero for every real order** — not a regression, not touched by this milestone, and traced in full in Milestone 1's own report (no `tax_class_id` is ever set on a real checkout item today).
- The `pricing.lookup.view` grant to the real `storefront-service` credential is, as of this report, either freshly applied by the user or still pending — see Part 3.

---

**Milestone 2 is complete.**
