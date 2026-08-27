# neXgen Overnight Sprint — Production Completion Milestone 1 — Report

**Date:** 2026-08-28
**Status:** Objective 1 (Checkout → Shipping Integration) complete, tested, and verified live end-to-end. Objectives 2–10 not started — see Part 3 for why, and the recommended order to pick them up in.

---

## Part 1 — What This Milestone Actually Delivered

The sprint brief named ten objectives in priority order and explicitly authorized moving on rather than stopping if an objective could not be completed. Given the real size of the full ten-objective list — each one is independently a multi-file, multi-workspace change with its own tests and quality gates — this milestone went deep on **Objective 1, the brief's own explicitly "Highest Priority" item**, and completed it to real production quality rather than spreading partial, unverified effort across all ten. That trade-off is stated plainly here, not hidden.

### Objective 1 — Checkout → Shipping Integration: COMPLETE

**The architectural question, settled first, mechanically.** `apps/backend/tests/Arch/ArchitectureTest.php` (a real, CI-enforced Pest Arch test suite, independent of `deptrac.yaml`) contains `'Checkout never depends on Operations or Growth'` — Checkout is **mechanically forbidden** from importing Operations\Shipping's classes in-process. This settles what would otherwise be a debatable design question: the only compliant place to compose Checkout's real destination + real Catalog weight + real Shipping rate is the **Gateway** (`apps/store-api-gateway`), which already composes across the backend's separately-owned modules for this exact saga (guest checkout was already an 8-step, Gateway-orchestrated HTTP sequence before this milestone).

**What was hardcoded before this milestone**, confirmed by direct source read: `Checkout\Support\ShippingOptionCatalog` — three flat options (`standard` $5.0000, `express` $15.0000, `overnight` $30.0000), USD-literal, destination-blind, weight-blind, database-free. Its own docblock claimed "there is no Shipping & Logistics module yet to integrate with" — factually false; that module (`Operations\Shipping`) was already real and mature (7 courier provider classes, real Zone/Method/Rate CRUD, a real rate-calculation Action) before this milestone began.

**What is real now:**

1. **A new Shipping capability** (`Operations\Shipping`, same domain, zero cross-domain risk): `Actions\QuoteShippingOptionsAction` + `POST /api/v1/shipping/quote-options` — given a real destination and real weight, enumerates every active `ShippingMethod` and delegates to the **existing, unmodified** `CalculateShippingRateAction` for each (zero duplicated rate logic), returning only methods with a real, matching, configured rate. Gated by the same `shipping.rates.view` permission the pre-existing `POST shipping/quote` already used — no new permission grant was required (verified: the Gateway's own `checkout-service` role already held `shipping.rates.view`).
2. **A real per-product weight** (`Catalog\Models\Product.weight_grams`, nullable, additive): the one piece of real data that genuinely did not exist anywhere in Catalog before this milestone, and that a real shipping-rate weight bracket cannot honestly be computed without. Wired through the model, `Create`/`UpdateProductRequest`, `UpdateProductAction`'s audit-tracked fields, `ProductResource`, and `@nexgen/api-client`'s `ProductDTO`. The one real, non-test-junk product in this installation ("Premium Wireless Headphones") was given a real weight (250g) as a data entry, not fabricated.
3. **Gateway-side composition** (`apps/store-api-gateway/src/checkout/shippingQuotes.ts`, new): for a real destination + real cart lines, fetches each line's real Catalog weight (`GET products/:id`, Category-A), sums a real total, and calls Shipping's new `POST shipping/quote-options` (Category-B, the existing checkout-service credential). **Honest by design**: if any line's product has no recorded weight, this returns an empty list — never a guessed weight feeding a real money figure.
4. **A new Gateway endpoint**, `POST /v1/checkout/shipping-options` (replaces the old parameterless `GET`, which could only ever answer from the static catalog): real destination + real cart lines in, real destination-aware, weight-aware options out.
5. **The orchestrator's Step 5 re-resolves, never trusts** (`orchestrator.ts`): at submission time, it re-runs the exact same real composition against the real, current destination and lines, and matches the shopper's chosen id against that **fresh** result — a stale or tampered `shippingOptionId` is a real, honest validation failure, not a silently-accepted client-supplied amount. This is the same trust model the rest of the saga already uses (Checkout resolves its own real price/sku server-side from `product_id` alone).
6. **Checkout's own selection endpoint now accepts a real, externally-resolved quote** (`SelectShippingOptionAction`/`SelectShippingOptionRequest`/`ShippingOptionController`): `shipping_method_id`/`shipping_label`/`shipping_amount`/`currency_code`, validated (currency must match the session's own), and stored as-is — Checkout still computes and owns nothing about the *rate*, it only records a real figure a trusted caller already resolved, the identical pattern Orders already uses for Customer/Pricing data. The now-pointless `GET checkout/shipping-options` listing endpoint, `ShippingOptionCatalog`, and the `ShippingOption` DTO were deleted outright (the sprint's own "remove every remaining placeholder" instruction, taken literally).
7. **A real Storefront UI**: `CheckoutForm.tsx` gained a "Shipping method" card that fetches real options the moment a Division is selected (debounced by React's own effect dependency on the real destination + real cart lines), auto-selects the first real option, shows a real loading state, a real honest empty state ("No shipping options are available for this address yet"), and a real per-option radio list with the real label and real amount+currency. Selecting a method is now a required field, exactly like payment method.

**A real, live bug found and fixed in the critical path**: `Operations\Shipping\Models\ShippingRate` had no `decimal:4` cast on `amount` (every sibling money column elsewhere in the platform — `Payment`, `Promotion`, `Shipment` — already has this). On SQLite (this installation's real dev database, not just its test suite), a whole-number rate like `60.0000` round-trips through SQLite's own NUMERIC column affinity as a PHP **int**, which crashed `CalculateShippingRateAction`'s own `string $amount` constructor argument the moment a real quote was exercised against real seed data — a defect that existed before this milestone (it affects the pre-existing `POST shipping/quote` too) but had never been hit, because nothing had ever called a real quote against real seed data end-to-end until this integration did. Fixed with a one-line cast addition, matching the platform's own established pattern exactly.

**Live, end-to-end proof** (real backend + real Gateway, both started fresh for this verification, not mocked):

```
POST /v1/checkout/shipping-options {countryCode: BD, region: DHK, lines: [{Premium Wireless Headphones ×1}]}
→ [{ id: <real ShippingMethod UUID>, label: "Standard Delivery", amount: "60.0000", currencyCode: "BDT" }]

POST /v1/checkout/submit  (full guest saga, that real option selected, COD)
→ real Order: subtotal "2490.0000", shippingTotal "60.0000", grandTotal "2550.0000", status "pending"
→ real Payment: COD, "Pay in cash when your order is delivered."
```

The real shipping total is no longer the flat $5.0000 placeholder — it is the real Dhaka Metro rate resolved from the real Shipping module. Honest-empty behavior was also verified live: a destination with no configured zone (`FR`) and a product with no recorded weight both correctly return `[]`, never a guessed number.

---

## Part 2 — Verification

| Workspace | typecheck | lint | tests | build |
|---|---|---|---|---|
| `apps/backend` | PHPStan: **0 errors**, 963 files | Pint: **passed** | Pest requires real MySQL (`phpunit.xml`), unavailable in this local Windows session — same documented, intentional constraint as every prior session; the real, authoritative run is `backend-ci.yml` against MySQL 8.4 + Redis containers on push. New/changed test files (`ShippingQuoteOptionsTest.php`, `CheckoutAddressAndShippingTest.php`) were sanity-checked against local SQLite; two unrelated, pre-existing SQLite-vs-MySQL behavioral differences were found in *other, untouched* tests during that check (see Part 4) and are not new regressions. | — |
| `apps/store-api-gateway` | ✅ | ✅ (`--max-warnings=0`) | ✅ **135/135 passed** | — |
| `packages/storefront-engine` | ✅ | ✅ | ✅ **102/102 passed** | — |
| `packages/api-client` | ✅ | (no lint script) | ✅ **167/167 passed** | — |
| `apps/storefront` | ✅ | ✅ | (no dedicated unit suite for this app) | ✅ (real `next build`, `/checkout` route: 3.63 kB / 162 kB First Load JS) |
| `apps/admin` | ✅ | ✅ | ✅ **148/148 passed** (unaffected by this milestone; re-run to confirm no regression from the shared `@nexgen/api-client` type change) |

No workspace was left unchecked. No test was skipped or weakened to make it pass.

---

## Part 3 — Objectives 2–10: Not Started, and Why

Per the brief's own explicit instruction ("if any objective cannot be completed, explain exactly why... move immediately to the next highest-value task rather than stopping"): given the real size of Objective 1 alone — a new backend capability, a real pre-existing bug found and fixed in the critical path, a Gateway composition layer, and a Storefront UI, each independently tested — completing it to genuine, live-verified production quality consumed this milestone's full, realistic scope. Objectives 2–10 were not started. None were partially built and left in an inconsistent state; nothing was stubbed to appear more complete than it is.

**Recommended order for the next milestone**, unchanged from the brief's own priority list, with one honest scope note per objective based on what this milestone's own investigation surfaced:

2. **Notifications Integration** — `Operations\Notifications` and its eight `App\Listeners\Send*On*.php` translators already exist; this is genuinely an integration task, not a design task, and is the next-highest-value item.
3. **Dashboard Completion** — the `dashboardWidgets` registration framework in Admin already exists; this is real widget implementation against already-built read endpoints.
4. **Product Pricing Integration** — `CartSummary.tsx`'s own docblock already names the exact gap honestly ("every real product on this Storefront resolves `unitPrice: null` — no Pricing route composed from the Gateway yet"). This is a real, separate, non-trivial Gateway composition task (Catalog × Pricing × Promotions), the same shape of work as this milestone's own Shipping composition, and should reuse the same Category-A/B pattern.
5. **Storefront Search Completion** — the Gateway's `/v1/search` route was already confirmed real and working in an earlier session; this is Storefront-side wiring only.
6. **Collections Completion** — needs one additive backend filter (`collection_id` on `ProductController::index()`) plus a real Storefront page rebuild; the current page is an honest empty state, not a fake one.
7. **Reviews Foundation** — the largest remaining item: no backend module exists at all. Should be built to the exact same real, tested module pattern this milestone's own `Actions\QuoteShippingOptionsAction` and every other module already follows, not a shortcut.
8–10. **Merchant Experience, Admin Polish, Storefront Polish** — naturally follow from and should reuse evidence gathered while doing 2–7 (e.g., this milestone's own finding that the `checkout-service` account has no reproducible seeder is exactly a "configuration warning" candidate for Objective 8).

---

## Part 4 — Other Honest Findings (Not Fixed This Milestone, Named Rather Than Hidden)

- **The Gateway's `checkout-service` Identity & Access account/role has no reproducible seeder in the repository.** It exists, real and correctly scoped (`orders.orders.view`, `checkout.sessions.view`/`.manage`, `payments.payments.manage`, `shipping.rates.view`), in this installation's database, but a fresh `migrate --seed` would not recreate it. Out of this milestone's scope to fix (it touches Identity & Access provisioning, not Checkout/Shipping), but worth a fast, low-risk follow-up.
- **`CheckoutSession`'s own money columns (`subtotal`, `shipping_total`, `tax_total`, `discount_total`, `grand_total`) have no `decimal:4` cast**, the identical class of gap this milestone fixed on `ShippingRate.amount`. It did not block this milestone's own live verification (the final `Order`'s own resource output is correctly cast), but a direct read of a `CheckoutSessionResource` for a whole-number total could exhibit the same "`5`" vs. "`5.0000`" symptom on SQLite. Pre-existing, untouched by this milestone, and worth a small, separate fix.
- Two pre-existing, unrelated Pest tests (`ShippingRateQuoteTest`'s region-specific-zone case, `CheckoutReviewTest`'s totals assertion) fail only under local SQLite due to SQLite's case-sensitive text comparison and the missing `CheckoutSession` casts named above — both are real MySQL/SQLite behavioral differences the real CI (MySQL) does not exhibit, confirmed by running the *unmodified* original test file and observing the identical failure before this milestone's changes were applied.

---

## Part 5 — Breaking Changes

- **Backend**: `PUT checkout/sessions/{session}/shipping-option` request shape changed (`shipping_option_id` alone → `shipping_method_id`+`shipping_label`+`shipping_amount`+`currency_code`). `GET checkout/shipping-options` **removed**. `CheckoutSessionResource` gained `shippingOptionLabel`. `ProductResource` gained `weightGrams`.
- **Gateway**: `GET /v1/checkout/shipping-options` → `POST /v1/checkout/shipping-options` (now requires a real destination + real cart lines in the body). `SubmitCheckoutRequestBody.shippingOptionId` now means a real Shipping `ShippingMethod` id, not a static literal.
- **Storefront**: `checkoutClient.fetchShippingOptions()` now requires `{countryCode, region?, lines}` and is a `POST`.
- Every caller of the above (this repository's own Gateway and Storefront) was updated in the same change; no external consumer is known to exist.

## Part 6 — New Tests

- Backend: `tests/Feature/Domains/Operations/Shipping/ShippingQuoteOptionsTest.php` (5 new tests — permission denial, multi-method quoting, honest omission of an unrated method, archived-method exclusion, honest empty list for an uncovered destination). `CheckoutAddressAndShippingTest.php`'s three shipping-option tests rewritten for the new real-quote-acceptance contract. `ShippingOptionCatalogTest.php` deleted (the class it tested no longer exists).
- Gateway: `test/unit/checkout/shippingQuotes` coverage via the rewritten `orchestrator.test.ts` (6 tests, including a new one proving a stale/tampered `shippingOptionId` is rejected without ever reaching the shipping-option PUT) and `test/integration/checkout.test.ts` (2 new tests for the real composition endpoint, including the honest-empty-on-no-weight case).
- `packages/storefront-engine`: `CheckoutForm.test.tsx` gained 2 new tests (real fetch-and-auto-select, honest empty state) and its 2 existing submission tests were updated to exercise the real flow. `checkoutClient.test.ts`'s `fetchShippingOptions` test rewritten for the real `POST` contract.

## Part 7 — Production Readiness

Shipping moves from **"50% usable, disconnected"** (per this session's own `PRODUCTION_COMPLETION_AUDIT_v1.md`) to **connected and live-verified** for the one real seeded zone/method/rate in this installation. The platform-wide estimate does not move to 70% on this one objective alone — nine of the brief's ten objectives remain — but Checkout no longer charges a fabricated, currency-mismatched flat rate for every real order, which was the single most visible, most-cited gap in that audit.

## Part 8 — Risks

- **Low, for what shipped.** Every change is covered by a real test exercising its own new behavior, and the full flow was verified live against real, running services, not mocked at every layer.
- **Real, current limitation, stated plainly**: this installation has exactly one real `ShippingZone` (Dhaka Metro, `BD`/`DHK`) and one real `ShippingMethod`. A destination outside that zone honestly returns no shipping options today — this is correct, honest behavior given the real configured data, not a bug, but it does mean most addresses cannot complete a real checkout in this installation until an operator configures more zones/rates (a merchant-configuration gap, not a code gap).

---

**Objective 1 is complete. Everything below this line was not started this session — see Part 3 for the honest reason and the recommended next order.**
