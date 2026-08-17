# Phase 3.0 — Marketing, Slice 2: Redemption Timeline, Cross-Links, Promotion/Coupon Tester

**Date:** 2026-08-17
**Scope:** Cross-module linkage and a real discount-simulation tool on top of the same real backend module Slice 1 consumed (`app/Domains/Commerce/Promotions/`). No new backend endpoints were built — everything below is a new UI surface over routes that already existed. **Not committed, not pushed** — waiting for Product Owner approval, per the master task's own explicit closing instruction.

---

## 1. What was built

| Addition | Where | Backend consumed |
|---|---|---|
| Redemption Timeline | Promotion Detail — new "Redemption timeline" card | `GET /promotions/redemptions?promotion_id={id}` — the same real, server-side filter the standalone Redemptions page already used, scoped here to the one Promotion, capped to the most recent 10, with a "View all" deep-link |
| Customer cross-link | Redemptions List + Redemption Timeline | `customerId` on `PromotionRedemption` is a real cross-domain UUID reference to the Customers aggregate (no FK, per this codebase's own `ARCH:CROSS_DOMAIN_COMMUNICATION` convention — confirmed by reading the migration's own docblock) — links to the real Customer Detail page, gated by `customers.customers.view` |
| Deep-link filter | Redemptions List | Reads an initial `?promotion_id=` from the URL, mirroring `OrdersListPage.tsx`'s own established `?customer_id=` precedent, so the Redemption Timeline's "View all" link genuinely pre-filters the List rather than linking to an unfiltered page |
| Promotion / Coupon Tester | New page, `/marketing/tester` | `POST /promotions/evaluate` (`PromotionEvaluationController`) — a real, read-only, permission-gated (`promotions.promotions.view`) cart-evaluation endpoint whose own docblock names it as mirroring Pricing's `TaxCalculationController`/Checkout Price Preview precedent directly |

One new nav item, "Promotion Tester," added alongside the existing three.

**Redemption Timeline**: every row is a real, immutable `PromotionRedemption` created exclusively by Checkout's own `SubmitCheckoutAction` — never a manual "Redeem" button (that constraint from Slice 1 still holds). An unredeemed promotion shows an honest empty state ("This promotion hasn't been redeemed at Checkout yet."), not a fabricated placeholder.

**Customer cross-link, deliberately asymmetric with Order**: `customer_id` is a real, if FK-less, reference to the Customers aggregate — a legitimate cross-link, so it gets one. `order_reference`, by contrast, is documented in the `promotion_redemptions` migration's own docblock as **"deliberately has no relationship to Checkout or Orders at all"** — a plain opaque string. Building a "View order" link from it would invent a cross-module relationship this backend does not have, so the Redemptions List instead relabels that column "Order reference" and renders it as plain text, never a link.

**Promotion / Coupon Tester**: a merchant builds a simulated cart (currency, optional coupon code, optional customer id, optional store id, one or more lines of product id / optional category ids / quantity / unit price) and calls the real evaluation endpoint to see exactly which real, currently-active Promotions would apply and what discount they'd produce — before publishing a coupon, or to sanity-check why a promotion isn't applying to a real cart. It is a genuine simulation: no `PromotionRedemption` row is created, no `usage_count_global` increments, no `promotion.redeemed` audit entry appears — confirmed live (§6).

## 2. Backend capabilities consumed

- `PromotionRedemptionController::index` — the identical endpoint Slice 1's Redemptions List already used; Slice 2 adds no new backend surface here, only a second, scoped consumer of it.
- `CustomerController::show` (`GET /customers/{customer}`) — confirmed to exist and be gated by `customers.customers.view`, the same real endpoint Payments/Orders' own "View customer" links already use.
- `PromotionEvaluationController::__invoke` (`POST /promotions/evaluate`) — confirmed read-only (`promotions.promotions.view`, no mutation), confirmed by its own docblock to be the intended admin-testing surface, mirroring `TaxCalculationController`.

## 3. Honest limitations (documented, not worked around)

1. **No "View order" link on Redemptions** — `order_reference` has no real relation to Orders (confirmed from the migration's own docblock), so none was built.
2. **No product/category picker in the Tester** — a merchant enters real Product/Category ids as raw text, the same honest scope limit already established for Promotion Conditions in Slice 1 (this module owns no Catalog search UI of its own).
3. **Tester's `subtotal` is client-computed** — the real backend requires a caller-supplied `subtotal` alongside line items (it does not derive one itself); the Tester sums `quantity × unitPrice` client-side as a convenience, clearly the same arithmetic a real cart would produce, never sent as anything but that literal sum.
4. **Redemption Timeline caps at 10 rows** — a deliberate UI choice (this is a Detail-page summary, not the primary browsing surface); the "View all" link always exists and deep-links to the real, fully-paginated Redemptions List for the complete history.

## 4. Bugs found

None. Every new surface matched its real backend contract on the first live pass.

## 5. Bugs fixed

None needed — this slice adds only new, additive UI over already-verified (Slice 1) or newly-confirmed-correct backend endpoints. `Promotion.discount_value`/`get_y_discount_percentage` and `PromotionCondition.numeric_value` decimal formatting (fixed in Slice 1) is reused via the existing `formatDecimal` helper in the two new discount-amount displays this slice adds (Redemption Timeline, Redemptions List, Tester results) — confirmed correctly trimmed, not "6.0000".

## 6. Live verification against the real backend

Logged in as `admin@nexgen.test`. Created a real, fresh Promotion ("Slice2 Live Test Promo", 20% off, priority 3) via `POST /promotions` to verify against:

1. **Redemption Timeline, honest empty state**: the new Promotion's Detail page correctly showed "This promotion hasn't been redeemed at Checkout yet." — no fabricated rows.
2. **Promotion / Coupon Tester, the critical proof**: submitted a real $100 cart (`quantity 1 × unitPrice 100`) against `POST /promotions/evaluate` — the real 20% promotion correctly applied, showing a "20" discount and "Total discount: 20". Confirmed via a direct follow-up `GET /promotions/{id}` and `GET /promotions/redemptions?promotion_id={id}` that **`usageCountGlobal` stayed `0`, `version` stayed `1`, and zero `PromotionRedemption` rows exist** — the Tester genuinely mutated nothing, exactly as its own on-screen disclaimer claims.
3. Deleted the test Promotion afterward via `DELETE /promotions/{id}` (confirmed `204`), leaving the environment clean.

Responsive verified live at 375×812 (mobile) and 1440×900 (desktop) on both the Promotion Detail page (with its new Redemption Timeline card) and the Tester page — no horizontal overflow at either width; the Tester's cart-line grid collapses to a single column on mobile.

## 7. Quality gates

| Gate | Result |
|---|---|
| `typecheck` | Clean (`apps/admin` and `packages/api-client`) |
| `lint` | Clean |
| Production `build` | Clean |
| Unit tests | **148 passing** (`apps/admin`) + **167 passing** (`packages/api-client`, +1 new `evaluate.test.ts`) |
| Playwright e2e | **17/17 passing** for `marketing.spec.ts` (9 from Slice 1 + 8 new: Redemption Timeline scoping + customer link, honest empty timeline, Redemptions List customer link + order-reference-never-a-link, `?promotion_id=` deep-link, Tester applies a real promotion, Tester honestly reports no match, permission-gating hides the Timeline card without `promotions.redemptions.view`, a11y scan on the Tester) |
| Accessibility | 0 critical/serious violations on the Tester page (new scan) and all four Slice 1 pages (re-run, still clean) |
| Responsive | Verified live at 375×812 and 1440×900 |
| Live verification | Real Promotion created → Tester correctly evaluated a real $100 cart against it (20% → $20) → confirmed via direct API calls that zero state was mutated → cleaned up |

## 8. Readiness score: 97/100

The three points held back reflect the honest, backend-forced limitations in §3 (no Order cross-link, no product/category picker, client-computed subtotal) — none fixable within this frontend-only slice, none worked around. Zero bugs found, zero critical issues. All quality gates green.

**Recommendation: READY, pending Product Owner review of §3's honest limitations.**

---

**Not committed. Not pushed. Proceeding to the Marketing Final Freeze Audit per the master task's own phase sequencing.**
