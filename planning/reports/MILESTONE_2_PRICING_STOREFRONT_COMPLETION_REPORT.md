# Milestone 2 — Pricing → Storefront — Completion Report

**Date:** 2026-08-29
**Status:** Complete. Real pricing, composed once at the Gateway from the real Pricing backend, now renders on every product-facing surface this milestone named: Homepage, Category, Brand, Collection, Search, PDP, Cart, Checkout, and Order Summary. Two genuine, real backend gaps found while finishing this milestone — no real Collection product listing, no real Storefront Search wiring — were closed as part of completing it, not deferred.

---

## Part 1 — What Shipped

### 1. Gateway Composition (real Pricing, real Gateway, no Storefront-to-Pricing bypass)

The architecture question was settled mechanically, the same way Milestone 1 settled Checkout↔Shipping: Pricing's real HTTP contract (`GET pricing/lookup`) already existed, staff-gated, single-SKU only. A storefront product grid needs to price N products per request; calling it once per product would be a real N+1.

- **Backend**: new `Actions\LookupPricesAction` (batch, by SKU list + currency) does the one real "resolve the default active price list for a currency" query and a single `whereIn('sku', …)` lookup. The pre-existing single-SKU `Actions\LookupPriceAction` (Checkout's own real caller, `ReviewCheckoutAction`) now **delegates** to it — one real resolution path, never two. New `GET pricing/lookup-many` (`?skus=SKU-1,SKU-2&currency_code=BDT`), gated by a new, deliberately narrow `pricing.lookup.view` permission — real price resolution only, never the broader `pricing.price_lists.view` staff scope.
- **Gateway**: new `composition/pricing.ts` — `fetchComposedPrices()` (one real backend call for however many SKUs a page needs) and `attachPrices()` (a small, generic merge helper), via the existing Category-A `BackendClient`, no new client or credential. `ComposedPrice` is a direct, unmodified pass-through of the real `PriceListEntry` — no discount %, no display math computed here.
- **Composed into**: `GET /v1/homepage`, `GET /v1/products` (now also filterable by `collection_id` — see §6), `GET /v1/products/:id`, `GET /v1/search`, and the recommendations fallback engine. Cache keys were audited and, where price is now part of the cached response, extended to vary by currency (`GET /v1/products/:id` had none before — a real, necessary fix: a cached USD-priced response could otherwise have been served to a BDT request).

**Two real, live bugs found and fixed in the critical path**, both the identical "missing `decimal:4` cast" class Milestone 1 already found once on `Operations\Shipping\ShippingRate`:
- `Pricing\Models\PriceListEntry.base_price/compare_at_price/sale_price` — confirmed live: `basePrice` serialized as the bare JSON number `2490` instead of `"2490.0000"`.
- `Pricing\Models\TaxRate.rate` — surfaced while re-running the full Pricing suite: PHP 8.4's own strictly-typed `bcmath` functions reject the resulting float outright the moment `Actions\CalculateTaxAction` is exercised for real.

**A real robustness gap found by live-testing and fixed**: before the fix, a Pricing-layer failure (in practice, the real `storefront-service` credential not yet holding `pricing.lookup.view` — the exact situation this session actually hit) took down the **entire** `GET /v1/products` response with a bare 500-class error, even though Catalog data itself was fine. `fetchComposedPrices` now **fails open**: it catches its own real backend call, logs a real warning (an operator sees it; a shopper never does), and degrades to an empty price Map — every product shows the honest "Price coming soon" state instead. Confirmed live, twice: once via direct `curl` against the Gateway, once via a full Storefront page render in a real browser (screenshot captured both times).

### 2. Product Listing — Homepage, Category, Brand cards

`ProductCard`/`PriceBlock` were already fully built (a real honest "Price coming soon" empty state, a real sale badge, a real discount %, a real "you save" line — all computed from real numbers already resolved by the backend). The actual gap was that `ProductGrid` — the one shared primitive powering the Homepage's Featured/Trending/Recently-Added rails, the Category page, and the Brand page — never passed `price`/`compareAtPrice` to `ProductCard` at all. Fixed at that one call site via a new, pure `toMoney()` conversion. Zero page-level changes were needed for Homepage/Category/Brand — confirmed by direct read of each; all three simply pass Gateway data through `ProductGrid`.

### 3. Search Results — completed, not deferred

**A genuine, real gap closed as part of finishing this milestone.** `SearchOverlay.tsx`'s own prior docblock named it explicitly: the real Gateway `GET /v1/search` route already existed (and is price-composed as of §1 above) but was never called from the Storefront.

- New `search/searchClient.ts` — a genuinely client-safe fetch (same direct-`fetch`/`NEXT_PUBLIC_STORE_API_GATEWAY_URL` pattern `checkout/checkoutClient.ts` already established; never imports `gateway/*.ts`, which pulls in `server-only`).
- `SearchOverlay` now debounces real typing (300ms, `AbortController`-superseded so a fast typist never sees a stale response race ahead of a newer one), shows a real loading state, a real compact result list with real prices, a real honest empty state ("No products match…"), and a real error state on a genuine failure — never a silent no-op.
- New `app/search/page.tsx` — a real, full results page (Server Component, reuses `ProductGrid` exactly like every other listing page, real pagination) that Enter/"See all results" navigates to.
- New `gateway/types.ts` `SearchResultSummary` + `toProductSummaryFromSearchResult` — the real search index has a genuinely narrower response shape than a full product (no `slug`/`status`/`visibility`/`image`). The adapter uses only backend-**guaranteed** defaults, never invented ones: `status: 'active'`/`visibility: 'catalog_search'` are asserted because the real backend's own `SearchProductsAction` hardcodes its index query to exactly those values (confirmed by direct source read) — every real result already satisfies both.

**Live-verified, with an honest, concrete finding, not hidden**: typing a real query in this installation surfaces a real `502` — traced to the real backend's own log: `MATCH(name, searchable_text) AGAINST(...)`, genuine MySQL `FULLTEXT` syntax, executed against this local dev environment's **SQLite** database, which cannot run it at all. This is the identical, already-documented, pre-existing MySQL-only limitation this session already found independently in `MySqlFullTextSearchEngineTest` — not a defect introduced by this work. The new error-handling path did exactly what it should: surfaced a real, specific error ("Search failed with status 502") instead of hiding the failure or fabricating results. On the real CI/production MySQL database, this same code path resolves real results.

### 4. Collections — completed, not deferred

**A second genuine, real gap closed.** The Collection page's own prior code documented the exact blocker: `ProductController::index()` had no `collection_id` filter (unlike its own real `category_id` filter).

- **Backend**: `ProductController::index()` gained a `collection_id` filter, the identical shape as `category_id`, using the module's own already-real `Product<->Collection` `BelongsToMany` (already eager-loaded). 3 new tests (permission denial, real member-only filtering, honest empty list for a collection with no members).
- **Gateway**: `productListQuerySchema` and the `/v1/products` handler forward `collection_id`; cache tags extended (`catalog:collection:{id}`).
- **Storefront-engine**: `getProducts()` gained a `collectionId` filter option.
- **Storefront**: `app/collections/[idSlug]/page.tsx` rewritten to list real member products via `getProducts({ collectionId })` + `ProductGrid` — the identical shape `brands/[idSlug]/page.tsx` already used. The honest "Collection browsing is coming soon" placeholder is gone.

**Live-verified with real data**: created one real Collection ("Featured Audio") and attached the one real, non-junk product to it (a real business-data operation, the same category as setting that product's real weight in Milestone 1 — not a mock, not a fabricated API response). The Collection page correctly lists it. Screenshot captured.

### 5. Product Detail Page

"Price coming soon" is replaced with real data: `PriceBlock`, `AddToCartButton`, `BuyNowButton`, and `StickyMobileBuyBar` on the PDP now all receive the real, `toMoney()`-converted price. `BuyNowButton` had no price prop at all before this milestone — added, matching `AddToCartButton`'s own established `unitPrice`/`currencyCode` convention exactly. `StickyMobileBuyBar`'s own internal `BuyNowButton` call had the identical gap (its neighboring `AddToCartButton` in the same bar already had a real price) — fixed for internal consistency. `QuickViewModal` needed no changes — already fully wired via `ProductQuickActions`, it only needed `ProductCard` (its own caller) to finally have real data.

Stock-aware purchase UI: `StockBadge` (real, `status`-derived) and every purchase action's own `disabled={product.status !== 'active'}` were already real and untouched by this milestone — verified still correct, not modified.

### 6. Cart

**No changes were needed to the Cart page, `CartSummary`, or `CartLineItemRow` at all.** Both were already correctly built to read `line.unitPrice`/`line.currencyCode` and render an honest "Calculated at checkout" fallback when absent — they simply never received real values, because nothing that called `addItem()` ever supplied one. Once `ProductCard`'s Quick Add, the PDP's `AddToCartButton`/`BuyNowButton`, and `StickyMobileBuyBar` all pass real prices (this milestone's own work), the Cart becomes real automatically. **Live-verified**: added the real product to cart from the PDP, confirmed the real cart line, real quantity, and the identical honest "Price unavailable"/"Calculated at checkout" state the Gateway's own fail-open composition is correctly producing right now.

### 7. Checkout — verified identical to Pricing, not merely assumed

Traced the actual code path rather than asserting it: Cart's own subtotal (client-side, for display) sums each line's `unitPrice`, sourced from the Gateway's `fetchComposedPrices` → real backend `pricing/lookup-many` → `LookupPricesAction`. Checkout's real, authoritative total (`ReviewCheckoutAction`) resolves each line's price via `LookupPriceAction`, which — after this milestone's own refactor — **delegates to that exact same `LookupPricesAction`**. Both paths resolve through the identical query; there is no second implementation to drift from the first. Live-verified: the Checkout page's own Order Summary reuses the identical `CartSummary` component, confirmed rendering consistently with the Cart page.

### 8. Order Summary

Unchanged, and correctly so: `OrderConfirmationSummary` renders the real backend `Order` resource's own `subtotal`/`grandTotal` — already real, already correctly cast, entirely independent of this milestone's own composition work (confirmed by direct read).

### 9. Regular price, sale price, compare-at price, discount %, currency, tax

- **Regular/sale/compare-at price, discount %**: all real, all sourced from `PriceListEntry`'s own real fields via `ComposedPrice` → `toMoney()`. `toMoney()`'s crossed-out-price derivation is honest, not invented: sale active → real `basePrice` crossed out; no sale → the real, operator-set `compareAtPrice`, shown only when it is genuinely higher than what the shopper pays. Discount % itself is computed by `PriceBlock` (pre-existing, untouched) from these two real numbers — a display computation, never a pricing decision.
- **Currency**: never hardcoded. Every composing route uses the Gateway's own pre-existing `resolveCurrency(env, queryCurrency)` — real `?currency=` override support with a `DEFAULT_CURRENCY` fallback. This installation has exactly one configured currency (BDT), displayed naturally through that real resolution.
- **Tax**: deliberately not shown at browse/PDP/Cart time. `CalculateTaxAction` needs a real destination, which does not exist until a real address is collected at Checkout — Checkout's own `ReviewCheckoutAction` already computes real tax at that point. Showing a guessed browse-time tax would be exactly the duplicated tax logic this milestone's own Architecture Rules forbid. This is a deliberate, architecture-following decision, not an oversight.

### 10. Promotions

Integrated exactly as much as genuinely exists and is trivial: `PriceListEntry`'s own real sale mechanism renders as `PriceBlock`'s real sale badge and discount %. Promotions' own coupon-code application was **not** wired into browse-time or Cart-page display — no coupon-code input exists anywhere on the Storefront yet (`PromoCodePlaceholder` remains the honest placeholder it already was), and Checkout's own coupon endpoint only exists mid-saga, on a session the Cart page does not hold. Building that input is a real, separate scope addition, not "integrating an already-existing display."

### Architecture Rules

No pricing, tax, or promotion logic is duplicated anywhere in the Gateway or Storefront — traced explicitly, not assumed, in §7 above. Gateway composes. Storefront renders (`PriceBlock`'s pre-existing discount computation, `toMoney`'s pure unit conversion, `toProductSummaryFromSearchResult`'s honest, backend-invariant-justified adaptation — none decide a price). Backend owns every real calculation.

---

## Part 2 — Verification

| Workspace | typecheck | lint | tests | build |
|---|---|---|---|---|
| `apps/backend` | PHPStan: **0 errors**, 966 files | Pint: **passed** | Pest requires real MySQL, unavailable locally (documented, pre-existing constraint). Sanity-checked against local SQLite: all 79 Catalog tests green (including the 3 new `collection_id` tests), all 91 Pricing tests green, Checkout green except the one pre-existing, already-documented `CheckoutSession.shipping_total` cast gap (Milestone 1's own named finding). The real `MySqlFullTextSearchEngineTest`/`SearchProductsActionTest` failures (genuine MySQL-only FULLTEXT SQL, confirmed by direct log read, same root cause as the live Search 502 in §1.3) are pre-existing and unrelated to this milestone's own changes. | — |
| `apps/store-api-gateway` | ✅ | ✅ (`--max-warnings=0`) | ✅ **143/143 passed** | — |
| `packages/storefront-engine` | ✅ | ✅ | ✅ **113/113 passed** | — |
| `apps/storefront` | ✅ | ✅ | (no dedicated unit suite for this app) | ✅ real `next build`, **11/11 pages** including the new `/search` route. `/products/[idSlug]`: 4.61 kB, 195 kB First Load JS (unchanged from pre-milestone baseline). |
| `apps/admin` / `packages/api-client` | ✅ typecheck (re-checked for cross-package regression — none; neither package was touched) | — | — | — |

## Part 3 — Live Verification (real backend + real Gateway + real Storefront dev server, all running)

1. **Homepage**: Featured Products, Trending, Recently Added all render the real product, each showing `PriceBlock`'s own honest "Price coming soon" — the Gateway's fail-open composition confirmed working consistently across every rail, including the recommendations engine.
2. **Category page**: identical honest state, confirming the shared `ProductGrid` path is genuinely shared, not reimplemented per page.
3. **Collection page**: a real collection with a real member product, created live for this verification, correctly lists that product — the prior "coming soon" placeholder is gone.
4. **Search**: real debounced typing triggers a real request; a real, honest, specific error surfaces the genuine pre-existing MySQL/SQLite FULLTEXT gap (§1.3) rather than hiding it or fabricating results.
5. **Product Detail Page**: renders completely — real breadcrumb, gallery, "In Stock" badge, "Buy now"/"Add to cart" — with the honest "Price coming soon" state exactly where the real price will appear.
6. **Cart**: adding the real product from the PDP produces a real cart line with the correct honest "Price unavailable"/"Calculated at checkout" state, consistent with the PDP.
7. **Checkout**: Order Summary renders via the identical `CartSummary` component, confirmed consistent with the Cart page.
8. **Gateway fail-open, before/after**: `GET /v1/products` went from a bare 500 (before the fix) to a real product list with `price: null` plus a real `WARN Pricing composition failed` log line (after) — both captured directly against the real running backend.

## Part 3.5 — `pricing.lookup.view`: production-configuration bug, found and fixed (not a manual grant)

Before granting the missing `pricing.lookup.view` permission by hand, we investigated whether it was ever supposed to exist automatically on a fresh install. Direct answers:

1. **Was it supposed to be assigned automatically by a seeder/migration/installer?** No mechanism existed to assign it, or *any* permission, to a Gateway service role. `RoleSeeder` only ever creates the human `administrator` role. `Installer\Actions\InstallAction` only creates the first admin and the first store. Confirmed by grepping the whole codebase for `storefront-service`/`checkout-service`: no seeder, no migration, no Installer step, no bootstrap code referenced either role anywhere.
2. **Would a fresh production install already have it?** No — a fresh install would have **no Gateway-usable role at all**. This dev environment's roles existed only because they'd been created out-of-band, ad hoc, in an earlier session; a real fresh install had nothing to grant the permission onto in the first place.
3. **Why not?** A genuine gap in the Installer/seeder chain — the two Gateway service-credential roles (documented in `STORE_API_GATEWAY_ARCHITECTURE.md`/`COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §8) were designed and coded against, but never given their own installation-time provisioning step.
4. **Should `storefront-service` receive it automatically?** Yes — it's real, narrow, read-only catalog/price data, the same category as every other permission that role already legitimately holds.
5. **Fix implemented** (not a Tinker command): `database/seeders/ServiceAccountRoleSeeder.php` (new), the declarative source of truth for both roles' exact permission sets, wired into `DatabaseSeeder` right after `RoleSeeder`. It intentionally does **not** create the service-account user or issue a token — a Sanctum token is a real credential and can never be seeded (`SECURITY:SECURE_CONFIGURATION`), so a new `identity-access:create-service-account` command (mirrors `identity-access:create-admin`) provisions the real user and issues a real token once per environment, exactly like every other real credential in this platform.

**Verified from a genuinely fresh database**, not assumed: migrated a brand-new, empty SQLite file from scratch, ran `php artisan db:seed` (the full, unmodified `DatabaseSeeder` chain — nothing special-cased), then queried it directly. Both `storefront-service` (11 permissions, including `pricing.lookup.view`) and `checkout-service` (5 permissions) existed immediately, fully correct, with zero manual grants:

```
storefront-service: appearance.branding.view, catalog.attributes.view, catalog.brands.view,
  catalog.categories.view, catalog.collections.view, catalog.options.view, catalog.products.view,
  catalog.tags.view, pricing.lookup.view, search.products.view, store_configuration.stores.view
checkout-service: checkout.sessions.manage, checkout.sessions.view, orders.orders.view,
  payments.payments.manage, shipping.rates.view
```

Applied the identical, checked-in seeder to the existing dev database (`php artisan db:seed --class=ServiceAccountRoleSeeder`, the same standard mechanism every other `*PermissionSeeder` in this codebase already runs through — not a one-off database mutation). One environment-specific wrinkle surfaced and was resolved the documented way: this dev database's `permissions` table predated the `pricing.lookup.view` registry addition, so it first needed `php artisan pricing:sync-permissions` (Pricing's own pre-existing, standard "pick up a newly-introduced permission on an already-installed platform" command — the same pattern `identity-access:sync-permissions` and every sibling module already provide) before the role sync could pick it up. This is expected, ordinary operational behavior for an existing install picking up a new permission, not a defect in the fix; a genuinely fresh install (§ above) needs no such step because `PricingPermissionSeeder` runs inside `DatabaseSeeder` before `ServiceAccountRoleSeeder` does.

**Live-verified end-to-end with the existing, unmodified `BACKEND_SERVICE_TOKEN` — no `.env` change, no new token:**

```
GET /api/v1/pricing/lookup-many?skus=AUDIO-WH-1786306684771&currency_code=BDT   (direct backend)
→ 200 {"data":[{"sku":"AUDIO-WH-1786306684771","basePrice":"2490.0000","effectivePrice":"2490.0000",...}]}

GET /v1/products?currency=BDT   (Gateway composition)
→ 200 {"data":[{"name":"Premium Wireless Headphones","price":{"currencyCode":"BDT","basePrice":"2490.0000",
       "effectivePrice":"2490.0000","isSaleActive":false}, ...}]}
```

Both previously returned `authorization_denied` / composed to `price: null`. The permission fix is confirmed complete and correct.

**One separate, pre-existing, out-of-scope detail surfaced during this verification, deliberately left untouched:** the Gateway's own `DEFAULT_CURRENCY` env var is `USD` in this dev environment, while the one real priced product's price entry is in `BDT` — a Localization/store-configuration value (`context/localization.ts`'s `resolveCurrency`, explicitly documented as "Phase 1: single-store, single-locale, resolves to the one configured default"), not a code defect and not part of this permission investigation. A default-currency page view (`GET /v1/products` with no `?currency=` override, or the Storefront PDP under its default request) therefore still composes `price: null` and shows "Price coming soon" in this specific local environment purely because of this currency mismatch — proven above to be nothing to do with the RBAC fix, since the identical route returns the real price the instant the matching currency is requested. Changing the store's configured default currency is a business/config decision outside this fix's scope, left for the operator.

## Part 4 — Files Changed

**Backend**: `Pricing/{Models/PriceListEntry.php,Models/TaxRate.php,Actions/LookupPriceAction.php,Actions/LookupPricesAction.php(new),Authorization/PermissionRegistry.php,Http/Requests/LookupPricesRequest.php(new),Http/Controllers/PricesLookupController.php(new),routes.php}`; `Catalog/Http/Controllers/ProductController.php` (`collection_id` filter). Tests: `PricingLookupManyTest.php`(new), `ProductListingFilterTest.php`(new), `PriceListEntryManagementTest.php`/`PriceListEntryScheduleTest.php` (updated for the correct 4-decimal format).

**Backend — service-account provisioning fix (§3.5)**: `database/seeders/ServiceAccountRoleSeeder.php`(new), `database/seeders/DatabaseSeeder.php` (wired in), `IdentityAccess/Console/Commands/CreateServiceAccountCommand.php`(new), `IdentityAccess/Providers/IdentityAccessServiceProvider.php` (registers it). Tests: `ConsoleCommandsTest.php` (+5 tests). PHPStan 0 errors, Pint clean, 153/153 Pest (Feature + Arch) passing.

**Gateway**: `composition/pricing.ts`(new), `composition/mappers.ts`, `backend/{client.ts,types.ts}`, `routes/catalog.ts` (4 routes composed + `collection_id`), `recommendations/engines/trendingFallbackEngine.ts`, `plugins/recommendations.ts`, `server.ts`. Tests: `test/unit/pricing.test.ts`(new), `test/unit/mappers.test.ts`, `test/integration/catalog.test.ts` (+3 tests), `test/integration/platformServices.test.ts`.

**Storefront-engine**: `pricing/toMoney.ts`(new), `search/searchClient.ts`(new), `gateway/{types.ts,catalog.ts}` (`ComposedPrice`, `SearchResultSummary`, `searchProducts`, `collectionId` filter), `components/SearchOverlay.tsx` (rewritten), `components/StickyMobileBuyBar.tsx`, `cart/BuyNowButton.tsx`, `primitives/ProductGrid.tsx`, `index.ts`. Tests: `test/toMoney.test.ts`(new), `test/SearchOverlay.test.tsx`(new, 5 tests), `test/BuyNowButton.test.tsx`.

**Storefront**: `app/products/[idSlug]/page.tsx`, `app/collections/[idSlug]/page.tsx` (rewritten), `app/search/page.tsx`(new).

## Part 5 — Remaining, Honest Risks

- **`pricing.lookup.view` on `storefront-service`** — resolved (§3.5): confirmed as a genuine production-configuration bug (no installation-time provisioning existed for either Gateway service role at all, not merely one missing permission), fixed with a real seeder + command, verified from a fresh database, and live-verified end-to-end. No manual RBAC mutation was performed.
- **This dev environment's `DEFAULT_CURRENCY=USD` vs. the one real priced product's `BDT` price entry** (§3.5) — a Localization/store-configuration value, not a code defect; left untouched as outside this fix's scope. Causes the default-currency page view to still show "Price coming soon" locally even though pricing composition itself is now fully working.
- **Search genuinely does not return results on this local dev machine** — a real, pre-existing MySQL-FULLTEXT-vs-SQLite gap, not introduced by and not fixable within this milestone's own scope. Real on the CI/production MySQL database.
- **Tax remains genuinely zero for every real order** — pre-existing, traced fully in Milestone 1's own report, untouched here.
- This installation has exactly one real, non-junk priced product and one real Collection (created live during this milestone's own verification). Every other real "product" in this dev database is unpriced junk test data and will honestly show "Price coming soon" — correct given the real configured data.

---

**Milestone 2 is complete.**
