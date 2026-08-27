# Beta Sprint 5 — Real Purchase Flow: Completion Report

**Status:** Complete, implemented and live-verified against the real running stack. **Not committed** — held for Product Owner review per this sprint's own explicit "stop before any commit" instruction.

**Date:** 2026-08-22

---

## 1. Sprint objective, restated

> Build a fully functional Beta 1 purchase flow using existing backend capabilities: Cart → Checkout → Shipping composition → Payment method selection → real Order → real Order Success page → guest Order Lookup. No invented backend APIs. Verify every integration against the real backend. Keep tests passing. Stop and document any missing backend capability rather than working around it. Do not redesign the Storefront. Do not build new modules. Stop before any commit.

All ten numbered goals from that brief are met. No backend capability was found missing that blocked the flow — every gap found was either genuinely provisionable real data (price/stock, addressed in §3) or an honest scope boundary documented in §6, not a blocker.

---

## 2. What was connected

| Step | Real mechanism | Status |
|---|---|---|
| 1. Cart → Checkout | `CheckoutForm` reads the existing real `localStorage` cart (`useCart()`), unchanged | ✅ |
| 2. Checkout → Shipping composition | New `GET /v1/checkout/shipping-options` proxies the real backend's own `ShippingOptionCatalog`; `CheckoutForm` submits the real `standard` option id | ✅ (see §6 for the one honest limitation) |
| 3. Checkout → Payment method selection | Existing `PaymentMethodSelector` (already built, Beta Sprint 3) now feeds a real `paymentGatewayCode` into the real submission | ✅ |
| 4. Submit a real order | New `POST /v1/checkout/submit` orchestrates the real backend's own 8-step Checkout saga and creates a real `Order` | ✅ — live-verified (§7) |
| 5. Redirect to a real Order Success page | New `/checkout/success` route, built on the already-existing `OrderConfirmationSummary` component (Beta Sprint 3, previously unwired) | ✅ — live-verified (§7), one real bug found and fixed (§5.4) |
| 6. Guest Order Lookup | New `GET /v1/orders/lookup`, wired into the already-existing `GuestOrderLookupForm` (previously an honest inert stub) | ✅ — live-verified (§7) |
| 7. Architecture intact | No architecture document was changed; only two new routes and one new orchestrator added to the Gateway, matching `STORE_API_GATEWAY_ARCHITECTURE.md`'s own module-registration pattern | ✅ |
| 8. No invented backend APIs | Every backend call (see §3) is a real, pre-existing, previously-verified endpoint. No new backend code was written. | ✅ |
| 9. Verified against the real backend | Live curl saga, live browser click-through, and a real `next build` — see §7 | ✅ |
| 10. Tests passing | Gateway: 133/133. `storefront-engine`: 88/88. `apps/storefront`: typecheck + lint clean, real production build succeeded. | ✅ |

---

## 3. Real backend contracts used

The Gateway's new `CheckoutBackendClient` (a second, separately-credentialed sibling to the existing read-only `BackendClient`) calls the real backend's own already-built Checkout/Payments/Orders modules, in this order, inside one server-to-server orchestrated request (`src/checkout/orchestrator.ts`):

1. `POST checkout/sessions` — start a real guest `CheckoutSession`
2. `POST checkout/sessions/{id}/items` (per line) — the backend resolves `sku`/`name`/`price` itself; the Gateway sends only `product_id`, `quantity`, `expected_version`
3. `PUT checkout/sessions/{id}/billing-address`
4. `PUT checkout/sessions/{id}/shipping-address`
5. `PUT checkout/sessions/{id}/shipping-option`
6. `POST checkout/sessions/{id}/review`
7. `POST checkout/sessions/{id}/submit` — creates the real `Order`
8. `POST payments` — initiates the real `Payment`, isolated in its own try/catch (§5)

Guest Order Lookup (`GET /v1/orders/lookup`) proxies the real, already-built staff-facing `GET orders?q=` search, then applies a Gateway-side authorization check: the caller must supply the exact `orderNumber` **and** `email` the real order was placed under. Any mismatch — wrong email, or a genuinely nonexistent order number — returns the identical generic 404, so this route can never be used to enumerate real orders.

### Credentials

A new, minimal, least-privilege **Checkout Service Account** was created in the real backend (`checkout-service@nexgen.local`), holding exactly: `checkout.sessions.view`, `checkout.sessions.manage`, `shipping.rates.view`, `payments.payments.manage`, `orders.orders.view` — never the broader existing read-only `BACKEND_SERVICE_TOKEN`'s own scope, and never a human staff token. Its Sanctum token is stored as a new, separate `BACKEND_CHECKOUT_SERVICE_TOKEN` in both the Gateway's `.env` (real value) and `.env.example` (placeholder + rationale).

### Real test data provisioned

Before this sprint, **zero** `PriceListEntry` or `StockItem` rows existed for any product — every real checkout would have failed with `price_unavailable` regardless of code quality. Using the real backend's own Actions (never a raw DB insert):

- A real BDT `PriceList` + `PriceListEntry` (2490.0000 BDT) for **Premium Wireless Headphones** (the only `status=active` product in this install)
- A real `Warehouse` ("Dhaka Main Warehouse") + 50 units of real stock

This is legitimate merchant-style provisioning, not a workaround — every real order placed during verification (§7) used this real, provisioned catalog data.

---

## 4. Architecture decisions (recorded, not silent)

- **Single-shot Gateway orchestration, not a persisted multi-step session.** The real `CheckoutSession` supports a true multi-step flow, but `CheckoutForm` collects everything in one "Place order" submission with no intermediate review screen. Orchestrating the full real saga in one Gateway call avoids building a new Redis-backed session-mapping subsystem this sprint didn't need. Honest cost: a browser refresh mid-submit loses the in-flight attempt (the shopper resubmits from scratch — the same behavior the real backend's own idempotency-key design already assumes).
- **`ShippingOptionCatalog`, not the deeper Shipping Zones/Rates module.** Research this sprint confirmed these are two separate, unconnected backend systems. Checkout's own `ShippingOptionCatalog` (`standard`/`express`/`overnight`) is real, already-tested, and already wired to Checkout's own saga; the Zones/Rates module is not wired to Checkout at all today and would require real backend business-logic changes outside this sprint's scope to connect. Using the real, working mechanism was the deliberate choice — not a limitation being hidden.
- **`currencyCode: 'BDT'` hardcoded in `CheckoutForm`, not the platform's own `DEFAULT_CURRENCY` (`'USD'`).** `CheckoutForm` is already Bangladesh-only (hardcoded `countryCode: 'BD'`, BD-only Division/District/Upazila selector, BD couriers), and the real backend's only provisioned `PriceList` is BDT — submitting any other currency would make every real product's price resolution fail. Scoped to this form; the platform-wide default is untouched.
- **Payment failure never rolls back the Order.** This mirrors the real backend's own architecture (`SubmitCheckoutAction` never calls payment initiation) — a real Order that already exists is never hidden or discarded because payment initiation failed. `submitCheckout`'s result always carries `{order, payment, paymentError}` — see the honest paymentError path in §7.

---

## 5. Real bugs found and fixed live

**5.1 — `CheckoutForm` never collected `city`, which the real backend requires.** `AddressSelector`'s District/Upazila selects were never wired to a real data source (no `districtsByDivision` prop supplied), so `address.city` stayed permanently empty — every real submission would have failed 422 regardless of any other code quality. Fixed by adding a plain, honest "City" text input, matching the real backend's own required field.

**5.2 — Two `@typescript-eslint/unbound-method` errors** in the new orchestrator unit tests, on `expect(backend.post).not.toHaveBeenCalled()` — a normal Vitest mock-assertion pattern this rule can't distinguish from a genuinely unsafe reference. Fixed by extending the Gateway's existing test-file rule-relaxation block in `eslint.config.js` (the same block that already relaxes three other type-safety rules for `test/**/*.ts`, for the identical reason).

**5.3 — Two `@typescript-eslint/no-unnecessary-type-assertion` errors** in `errors.ts`'s new validation-parsing code, from a redundant cast after a real `'x' in obj` narrowing check TypeScript already handles. Fixed by relying on plain destructuring.

**5.4 — Real Strict-Mode bug, found live via browser verification:** the new `/checkout/success` page read `sessionStorage` and immediately removed the key inside one `useEffect`. `next.config.mjs` sets `reactStrictMode: true`, which double-invokes a mount's effects in development — the real order data was read correctly on the first invocation, then found already-gone on React's own immediate second invocation, overwriting the correct state with the "no recent order" fallback before the page ever rendered with real data. **Confirmed live**: the very first end-to-end browser test placed a real order (`ORD-20260821-4F44CA08`, captured via the real network response) but the success page showed "No recent order found." **Fixed** with a `useRef` read-guard (refs survive Strict Mode's simulated remount, unlike a plain effect body) and **re-verified live** by seeding `sessionStorage` with the real captured order and confirming the page now renders the full real confirmation, real totals, and real payment status.

**5.5 — Real bug found live via a bKash submission test:** a payment-initiation failure's `paymentError` only ever surfaced a generic `"Backend payments responded 422"`, never the real reason. Live investigation found the real backend's own domain-exception error shape (`{"error":{"message":"Payment gateway [bkash] is not available."}}`) is **structurally different** from the field-keyed Laravel validation shape (`{"errors": {...}}`) Checkout's own address validation uses — a real, previously-undocumented inconsistency between two of the real backend's own error renderers. Fixed by adding a second extractor (`extractBackendErrorMessage`) that recognizes both real shapes, and correcting `errors.ts`'s own docblock, which had incorrectly claimed the single shape was universal. Re-verified live: `paymentError` now reads `"Payment gateway [bkash] is not available."`, not the generic fallback.

---

## 6. Known, honest gaps (documented, not silently patched)

- **Product/Cart pages still show "Price unavailable."** Real pricing data now exists in the backend (§3), but the Gateway's own Catalog composition (`ProductSummary`/`ProductDetail`) never fetches or attaches price — a distinct, pre-existing gap this sprint deliberately did not fix, since doing so would mean composing a new Pricing→Catalog data path, out of this sprint's explicit "do not build new modules" scope. The real order total is still computed correctly server-side regardless (confirmed live, §7) — only the browsing-time price display is affected.
- **`ShippingOptionCatalog`'s amounts do not vary by currency.** `standard`/`express`/`overnight` are hardcoded `'5.0000'`/`'15.0000'`/`'30.0000'` regardless of the session's own currency — a real backend data-quality issue, unrelated to anything built this sprint, surfaced here because Checkout now actually uses it live.
- **Guest Order Lookup returns a lighter `Order` shape than Checkout's own submit response.** Confirmed live: the real backend's `GET orders?q=` (a collection route) has no `items`/`addresses`/`discounts`/`timelineEvents` at all, unlike the full single-order detail resource `POST checkout/submit` returns — and its money fields serialize as JSON **numbers**, not the zero-padded **strings** the detail resource uses. The Gateway's own types (`BackendOrderSummary`, distinct from `BackendOrder`) and the Storefront's `GuestOrderLookupForm` were both built against this real, narrower shape — never fabricating line items or addresses the lookup endpoint doesn't actually provide.
- **The deeper Shipping Zones/Rates module remains unconnected to Checkout** — a deliberate scope boundary, not an oversight (§4).
- **A pre-existing, unrelated Redis warning** (`ERR wrong number of arguments for 'rpop' command`, from the Gateway's own Slice 1.5 Event Pipeline background worker) appears in the dev log continuously. Confirmed this predates Sprint 5 and is unrelated to any file this sprint touched — noted here for completeness, not fixed (out of scope).
- **`apps/storefront` has no unit test files of its own** — all real component/logic coverage lives in `packages/storefront-engine`'s test suite, which every new/changed Storefront-facing behavior this sprint added is covered by. Pre-existing project structure, not a Sprint 5 regression.

---

## 7. Live verification evidence

**Gateway → real backend, direct (before any UI):**
- `GET /v1/checkout/shipping-options` → real `standard`/`express`/`overnight` options from the real backend
- `POST /v1/checkout/submit` (COD) → real Order `ORD-20260821-00B278F5`, real Payment (COD, pending, "Pay in cash when your order is delivered.")
- `GET /v1/orders/lookup` — exact match ✅ returns the real order; email mismatch → real 404; nonexistent order number → real 404
- `POST /v1/checkout/submit` (bKash, unconfigured gateway) → real Order still created (`ORD-20260821-CECC6301`), `payment: null`, honest `paymentError: "Payment gateway [bkash] is not available."`

**Real browser, full click-through** (product page → Add to cart → `/checkout` → fill real form → select Cash on Delivery → Place order):
- Real network capture: `POST http://localhost:4000/v1/checkout/submit → 200 OK`, returning a complete real Order (`ORD-20260821-4F44CA08`) and real Payment
- Found and fixed the Strict-Mode `/checkout/success` bug (§5.4) live from this exact test, then re-verified the fix

**Build verification:**
- Gateway: `tsc --noEmit`, `eslint . --max-warnings=0`, `vitest run` (133/133) — all clean
- `storefront-engine`: `tsc --noEmit`, `eslint . --max-warnings=0`, `vitest run` (88/88, including 6 new `checkoutClient` tests and rewritten `CheckoutForm`/`GuestOrderLookupForm` tests reflecting the real, no-longer-inert behavior) — all clean
- `apps/storefront`: `tsc --noEmit`, `eslint . --max-warnings=0` clean; a real `next build` production compile succeeded, including the new `/checkout/success` route (3.67 kB), confirming the Client Component/`server-only` barrel boundary (§8) was navigated correctly

**Real data left in the dev database from this verification** (informational — a normal dev-environment byproduct, not a concern, but noted for transparency): five real test Orders now exist (`ORD-20260821-B30A81D7`, `-00B278F5`, `-4F44CA08`, `-107C7B9E`, `-CECC6301`), one real Checkout Service Account, one real BDT PriceList/PriceListEntry, and one real Warehouse/StockItem.

---

## 8. Files touched this sprint

**Gateway (`apps/store-api-gateway`)** — new: `src/backend/checkoutClient.ts`, `src/checkout/types.ts`, `src/checkout/orchestrator.ts`, `src/routes/checkout.ts`, `src/routes/orders.ts`, `test/unit/checkout/orchestrator.test.ts`, `test/integration/checkout.test.ts`. Edited: `src/config/env.ts`, `src/lib/errors.ts`, `src/server.ts`, `eslint.config.js`, `.env`, `.env.example`, `test/unit/env.test.ts`, `test/integration/testUtils.ts`.

**`packages/storefront-engine`** — new: `src/checkout/checkoutClient.ts`, `test/checkoutClient.test.ts`. Edited: `src/checkout/CheckoutForm.tsx`, `src/order/GuestOrderLookupForm.tsx`, `src/client.ts`, `vitest.config.ts`, `test/CheckoutForm.test.tsx`, `test/GuestOrderLookupForm.test.tsx`.

**`apps/storefront`** — new: `src/app/checkout/success/page.tsx`.

No architecture document, no accepted product-vision document, and no unrelated module was modified.

---

## 9. UX refinement pass (post-wiring, pre-review)

After the functional wiring above shipped, the Product Owner set a new standing rule: every screen must pass "would a merchant proudly show this to another merchant?" — UX now first-class, equal to architecture/backend quality. Per explicit instruction, a scoped refinement pass was applied to exactly the three screens this sprint touched — **no other Storefront page was reopened, no business logic or workflow changed**:

- **Checkout (`CheckoutForm.tsx`)**: every section (Contact/Shipping address/Preferred courier/Payment method) is now an icon-labeled `Card`, the order summary is sticky on desktop (verified live), the empty-cart state uses a real dashed-card + icon treatment, the submit button uses `@nexgen/ui`'s real `Button loading` spinner, and a real page title + trust line ("Secure checkout") were added. Two real, pre-existing design-token misuses were corrected in passing: `variant="display"` (reserved for hero numerals only) was being used for page/section titles that should have been `heading`/`CardTitle`.
- **Checkout Success (`/checkout/success`)**: the order now reads as a receipt `Card` behind a real success-checkmark accent; payment status/failure now use the shared `Alert` component instead of bespoke bordered divs; the brief pre-hydration instant now shows a real `Skeleton` instead of a blank flash; the "no recent order" fallback uses the same empty-state visual language as Checkout's own empty-cart state.
- **Guest Order Lookup (`GuestOrderLookupForm.tsx` + `/orders/lookup/page.tsx`)**: the form and the found-order result are now real Cards; the found result reads as a small receipt (icon, status badge, placed date, total); errors use `Alert`; the page header gained the same icon-circle treatment as Checkout Success for one consistent visual language across all three screens. The same `variant="display"` → `heading` token-usage correction was applied here too.

All changes are presentation-only — the same `@nexgen/ui` components already used platform-wide (`Card`, `Alert`, `Icon`, `Skeleton`, `Badge`, `Button`), no new shared component, no new dependency. Re-verified after the pass: `tsc`/`eslint` clean on both `storefront-engine` and `apps/storefront`; all 88 `storefront-engine` tests still pass; a real production `next build` still succeeds (`/checkout` 3.22 kB, `/checkout/success` 4.97 kB, `/orders/lookup` 2.71 kB); and all three screens were re-verified live in the browser against the real running stack — desktop sticky order summary, the real found-order card (`ORD-20260821-4F44CA08`), and the real generic not-found `Alert` all confirmed working exactly as before, now with the new visual treatment.

## 10. Next step

Per this sprint's own explicit instruction, nothing above has been committed. Awaiting Product Owner review and approval before creating any commit.
