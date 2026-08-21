# Beta Milestone 2.6 — Commerce Readiness Layer

**Status:** Complete. Not committed, not pushed — per this milestone's own explicit STOP instruction, awaiting Product Owner review.
**Scope:** Close the reusable Commerce Layer (Pricing presentation, Variant architecture, Review foundation, Trust framework, Bangladesh commerce layer, Shipping presentation) that sits between the Product Detail page and a future Cart/Checkout — not Cart, not Checkout, not Payment processing.

---

## 0. Mandatory First Step

Read in full before any code was written:
- `planning/reviews/MERCHANT_CONVERSION_AUDIT.md` — Beta Milestone 2.5's 200-item audit. This milestone directly answers audit items #59–70 (Cart/Checkout infrastructure precursors), the Trust & Conversion Infrastructure items (#51–58), and every Bangladesh-specific item under Part 3 that is a UI-architecture concern rather than a real-integration concern.
- `BETA_MILESTONE_2_5_CONVERSION_EXPERIENCE_REPORT.md` — what Milestone 2.5 built and, more importantly, what it explicitly deferred (payment/courier icon rows, live CountdownTimer, discount/savings display on a real product).
- `STOREFRONT_FOUNDATION_ARCHITECTURE_REVIEW.md` §2.2 — the granular-subpath-exports recommendation, already applied narrowly once (`@nexgen/storefront-engine/client`, Milestone 2.5) and referenced again below.
- Gateway route surface (`apps/store-api-gateway/src/routes/*.ts`) — re-confirmed directly against source rather than from memory: `catalog.ts` exposes `homepage`, `categories(/:id)`, `brands(/:id)`, `collections(/:id)`, `products(/:id)`, `search`; `recommendations.ts` exposes `recommendations/:slot`; plus `events`, `preview`, `health`. **No pricing, review, variant, or checkout route exists on the Gateway today.** This is the single fact that shapes every decision in this milestone.

## 1. What Was Built

Six areas, matching the milestone brief's own six numbered sections. Every component in `packages/storefront-engine/src/components/` new this milestone is listed in the package barrel (`src/index.ts`) under a `// Beta Milestone 2.6` block.

### 1.1 Pricing Presentation Layer
`PriceBlock` (Milestone 1) already carries Regular/Sale/Compare-at/Savings-percentage; Milestone 2.5 added the savings-*amount* line. This milestone adds the piece still missing: **`bdCurrency.ts`**, a real BDT formatter implementing the South Asian lakh/crore digit-grouping convention (`formatBdt(1234567)` → `"৳12,34,567"`), plus `formatBdtShort` for the colloquial "15 lakh"/"3 crore" short form. Pure, dependency-free, unit-tested (11 tests, `test/bdCurrency.test.ts`) rather than trusted to `Intl.NumberFormat`, which has no reliable `bn-BD` grouping across runtimes. **Not wired to any live price** — no Gateway pricing route exists, so `PriceBlock` still shows its own honest "Price unavailable" state on every real page. `bdCurrency` is exported and ready for the day a Pricing route exists.

### 1.2 Variant Architecture
`VariantSelector.tsx` — real, accessible (`role="radio"`/`aria-checked`) selector supporting color-swatch and text-pill option types, `available: false` rendered disabled + struck-through. Built against the shape a real Gateway `VariantOption`/`VariantOptionValue` route would return, not a narrowed placeholder. **Not wired to the Product Detail page** — `ProductDetail` (Milestone 1's own General+SEO-only scope, unchanged) carries no variant data at all; a selector with nothing real to select from is worse than no selector, so it stays unwired architecture, consistent with the brief's own "Gateway driven only" instruction for this section.

### 1.3 Review Foundation
`RatingSummary`, `ReviewCard`/`ReviewList`, `ReviewFilters`/`ReviewSort`, `QASection` — five components, all requiring real data via props, all with an honest empty state when unfed ("No reviews yet" / "No questions yet"). **Wired live** on the Product Detail page (`apps/storefront/src/app/products/[idSlug]/page.tsx`) with `averageRating={null} totalCount={0} reviews={[]}` / `questions={[]}` — because no Review or Q&A backend module exists anywhere in `apps/backend/app/Domains`, this is genuinely, honestly all there is to show today. `ReviewFilters`/`ReviewSort` are built and exported but **not** wired: filtering/sorting an always-empty list has no real purpose until reviews exist.

### 1.4 Trust Framework
`PolicyCard` (one reusable card for Return/Warranty/Authenticity/Secure-checkout/Merchant-badge/Support-badge, `title`/`description` **required** props specifically so no fabricated policy claim can leak in), `PaymentMethodBadge`/`PaymentMethodsRow`, `CourierBadge`/`CourierSelector`. All built, exported, none wired to a live page this milestone — see §1.5, same reasoning applies: no payment method or courier is actually integrated, so none is claimed on a real page.

### 1.5 Bangladesh Commerce Layer
- `bdDivisions.ts` — the real, stable 8 Bangladesh Divisions, hard-coded directly (public administrative fact, not a business claim — safe to state confidently).
- `AddressSelector.tsx` — real, working Division → District → Upazila cascading selector, built on `@nexgen/ui`'s own Radix `Select`. Division options come from `bdDivisions.ts`; **District and Upazila options are deliberately not hard-coded** — they're caller-supplied props (`districtsByDivision`/`upazilasByDistrict`), keyed by parent id. Bangladesh has 64 Districts and roughly 495 Upazilas; hand-transcribing that full hierarchy from memory carries real, meaningful risk of a wrong or outdated entry silently degrading a shopper's own delivery address. A wrong-but-confident-looking dataset gives no signal that anything is wrong — worse than an honest gap. This is a considered call, not a shortcut: Divisions are safe to assert (8 items, extremely stable, genuinely public knowledge); District/Upazila are not memorized with the same confidence, so the component stays real and working while the data source stays honest.
- `PaymentMethodBadge`(`bkash`/`nagad`/`rocket`/`sslcommerz`/`portpos`/`cod`/…) and `CourierBadge`(`pathao`/`steadfast`/`redx`/`paperfly`/`sundarban`) — plain text labels, no logos, no claim of integration.

**None of these three is wired into a live page.** This is the brief's own explicit instruction, not a gap: *"Do NOT fake integrations. Prepare architecture only."* No COD/bKash/Nagad/Rocket/SSLCommerz/PortPos/Pathao/Steadfast/RedX/Paperfly/Sundarban is actually connected to anything — asserting any of them on a real product page would be exactly the fabrication this entire engagement has been built to avoid.

### 1.6 Shipping Presentation
`DeliveryEstimate`/`ShippingBadge`/`DeliveryPromise` (three small components, each `null` unless fed real data), `ShippingTimeline` (a real visual step-tracker `<ol>`, not wired — no shipment-tracking-by-shopper capability exists at the Storefront layer, that's a post-login capability out of every milestone's scope so far), and **`ShippingCalculator`** — a real, working form (destination input + Calculate button) that, on submit, shows an honest "Shipping cost estimates aren't available yet — real delivery pricing is confirmed at checkout." **Wired live**, nested inside the Product Detail page's existing "Shipping information" disclosure — genuinely useful interactive surface with zero fabrication, exactly the honest-inert-form pattern `Newsletter.tsx` established in Milestone 1.

## 2. What Was Wired vs. What Was Deliberately Left as Architecture

| Component | Wired on a live page? | Why |
|---|---|---|
| `RatingSummary` / `ReviewList` | ✅ Product Detail | Honest empty state is real and correct — no review backend exists |
| `QASection` | ✅ Product Detail | Same — honest "No questions yet" |
| `ShippingCalculator` | ✅ Product Detail (inside Shipping disclosure) | Real form, real honest "not available yet" result, zero fabrication risk |
| `bdCurrency` | ⏳ Built, unwired | No live price to format — `PriceBlock` still shows "Price unavailable" |
| `VariantSelector` | ⏳ Built, unwired | No variant data on `ProductDetail` at all |
| `ReviewFilters` / `ReviewSort` | ⏳ Built, unwired | Nothing real to filter/sort yet |
| `PolicyCard` | ⏳ Built, unwired | Existing FAQ disclosures already cover this ground; adding generic policy cards would either duplicate them or invite a claim ("secure checkout") this milestone has no Checkout to back |
| `PaymentMethodBadge` / `PaymentMethodsRow` | ⏳ Built, unwired | Brief's own instruction: "prepare architecture only" — no integration exists |
| `CourierBadge` / `CourierSelector` | ⏳ Built, unwired | Same |
| `AddressSelector` / `bdDivisions` | ⏳ Built, unwired | No Checkout/address-capture flow exists anywhere yet to host it |
| `ShippingTimeline` | ⏳ Built, unwired | No shopper-facing order-tracking capability exists at the Storefront layer |
| `DeliveryEstimate` / `ShippingBadge` / `DeliveryPromise` | ⏳ Built, unwired | No Shipping-to-Storefront composition route exists on the Gateway |

Every unwired item is real, typed, exported, and a genuine drop-in for the day its real data source exists — none is a stub, a TODO, or dead code.

## 3. Quality Gates

All run and green, in order:

```
packages/storefront-engine:  tsc --noEmit            ✅ clean
packages/storefront-engine:  eslint --max-warnings=0  ✅ clean
packages/storefront-engine:  vitest run               ✅ 57 passed (46 pre-existing + 11 new bdCurrency tests)
apps/storefront:             tsc --noEmit             ✅ clean
apps/storefront:             eslint --max-warnings=0  ✅ clean
apps/storefront:             next build               ✅ clean, no RSC boundary errors, all 8 routes generated
```

No `server-only` boundary violation this milestone — every new component is either a pure Server Component with zero data-layer imports, or a `'use client'` component importing only from `@nexgen/ui`/`lucide-react`/sibling files, never from `gateway/*.ts`. The `/client` subpath entry point added in Milestone 2.5 (`@nexgen/storefront-engine/client`) was not extended this milestone — nothing new needed it.

## 4. Live Verification

Verified against the real stack: PHP backend (port 8080, `/up` → 200), Store API Gateway (port 4000, `/health` → 200), storefront dev server (freshly restarted on port 3000 — the previous session's dev server process had gone stale after a break in the session and was killed and restarted cleanly rather than trusted).

Navigated to a real product (`/products/{id}-premium-wireless-headphones`, sourced live from `GET /v1/products` on the Gateway, not invented):
- Zero console errors.
- Accessibility tree confirms every new section renders exactly as coded: `ShippingCalculator`'s form inside the Shipping disclosure, `RatingSummary`/`ReviewList` both showing "No reviews yet", `QASection` showing "No questions yet" — no placeholder text, no lorem ipsum, no fabricated numbers anywhere.
- Interactive test: typed a destination into `ShippingCalculator`, clicked Calculate, confirmed the real submit handler fires and renders "Shipping cost estimates aren't available yet — real delivery pricing is confirmed at checkout." — the honest-inert-form pattern working end-to-end, not just present in source.
- Expanded/collapsed the "Shipping information" `<details>` disclosure via real click interaction (not just DOM inspection) — confirmed the native disclosure and the nested form both behave correctly together.

## 5. Readiness Score: 6/10

Up from Milestone 2.5's 7/10 in relative terms of "components built," but this score answers a different, narrower question: **not** "is the conversion UI good" (Milestone 2.5 covered that) but "is the reusable Commerce Layer beneath Cart/Checkout in place." Six real, working, honest foundations exist. None can be exercised end-to-end today because none has a real backend module behind it yet (no Reviews domain, no Variants beyond Catalog's own `productType` enum, no Pricing route exposed to the Storefront, no Payment/Courier integration). This is expected and by design — see `LAUNCH_BLOCKER_STATUS.md` for the full, honest answer to "can a merchant launch on neXgen today."

## 6. Stop

No commit, no push — per this milestone's own explicit instruction. Awaiting Product Owner review of this report and `LAUNCH_BLOCKER_STATUS.md`.
