# Phase 3.0 — Marketing, Slice 1: Promotions

**Date:** 2026-08-17
**Scope:** Promotions CRUD + nested Coupons + nested Eligibility Conditions + read-only Redemptions + Audit Log, against the real, already-complete backend module `app/Domains/Commerce/Promotions/` (there is no module literally named "Marketing" — see `planning/architecture/PHASE_3_0_MARKETING_ARCHITECTURE.md` §1), per that architecture doc's own Slice 1 recommendation. **Not committed, not pushed** — waiting for Product Owner approval, per the master task's own explicit closing instruction.

---

## 1. What was built

| Screen | Route | Backend consumed |
|---|---|---|
| Promotions (list) | `/marketing/promotions` | `GET /promotions` (`status`/`discount_type` filters, real pagination) |
| Promotion Detail | `/marketing/promotions/:id` | `GET /promotions/{id}` (eager-loads `conditions`/`coupons`) |
| Redemptions | `/marketing/redemptions` | `GET /promotions/redemptions` (`promotion_id`/`customer_id` filters, real pagination) — read-only, immutable, Checkout-populated |
| Promotions Audit Log | `/marketing/activity` | `GET /promotions/audit-logs` (`actor_id`/`target_type` filters, real pagination) |

One new nav group, "Marketing," added via `registerModule()` — the same zero-touch mechanism every prior module uses.

**Promotions List**: real, server-side `status`/`discount_type` filters (confirmed by reading `PromotionController::index` directly — no free-text search exists on the backend, so the search box is honestly labeled "Filter this page…" and only narrows the currently-loaded page, mirroring Catalog Brands List's own established precedent for the identical constraint). Row actions (View/edit, Archive, Delete) permission-gated behind `promotions.promotions.manage`.

**Promotion Detail**: Overview (discount type/value, priority, stackable, requires-coupon, schedule, global/per-customer usage, description), an **Eligibility Conditions** manager (add/edit/remove — `minimum_order_amount` via a numeric input, every other type via a raw reference-id text input since this slice owns no Product/Category/Customer/Store picker), and a **Coupons** manager (create/edit/archive/delete, each coupon independently versioned from its parent Promotion). Edit/Archive/Delete gated behind `promotions.promotions.manage`.

**Redemptions**: real, read-only, append-only history of every actual Checkout-side promotion/coupon application — never a manual "Redeem" action, since `POST /promotions/redeem` is exclusively `SubmitCheckoutAction`'s own concern (confirmed via grep — no other real caller exists).

**Promotions Audit Log**: the module-wide, real, server-paginated audit trail — `promotion.created/updated/archived/deleted/condition_added/condition_updated/condition_deleted/redeemed`, `coupon.created/updated/archived/deleted` — with a Type filter across the three real `target_type`s and a staff-resolved actor name. Only `Promotion`-targeted rows get a "View promotion" link; `Coupon`/`Condition` rows can't be traced back to their parent Promotion from a flat audit row (a real, honest constraint, documented rather than worked around).

## 2. Backend capabilities consumed

- `PromotionController::index/show/store/update/archive/destroy` — confirmed by reading directly: no restore endpoint exists for Promotions (matches Coupons — neither entity has one, unlike Catalog's Brands/Categories/Collections).
- `PromotionConditionController::store/update/destroy` — nested under a Promotion, no independent versioning (mutations thread the parent Promotion's own `expected_version`).
- `CouponController::index/show/store/update/archive/destroy` — nested under a Promotion, own independent `lock_version`. No top-level "all coupons" endpoint exists.
- `PromotionRedemptionController::index` — read-only, `promotion_id`/`customer_id` filters only.
- `AuditLogController::index` (Promotions' own) — `actor_id`/`target_type`/`per_page`, no `target_id` filter (the identical constraint every other module's own audit endpoint has).

## 3. Honest limitations (documented, not worked around)

1. **No product/category/customer/store picker for non-`minimum_order_amount` Conditions** — a raw reference-id text field is used instead, since this module owns no cross-module search UI of its own. Documented in-code, not papered over.
2. **No free-text search on Promotions List** — confirmed absent from the real backend.
3. **No manual "Redeem" admin action, no top-level Coupons list, no restore for archived/deleted Promotions or Coupons** — all confirmed absent from the real backend, not invented.
4. **Coupon/Condition audit rows can't deep-link to their parent Promotion** — the flat audit row only carries the child's own id, and the backend exposes no parent lookup from a Coupon/Condition id alone.

## 4. Bugs found

**One critical, pre-existing backend bug**, found during live verification, not introduced by this slice:

`Promotion.discount_value` (`decimal(14,4)`), `Promotion.get_y_discount_percentage` (`decimal(5,2)`), and `PromotionCondition.numeric_value` (`decimal(14,4)`) are all documented in their models' own docblocks as `string|null`, but **none of the three had a `decimal:X` PHP cast** — the identical root cause already fixed for `Payment.amount`/`PaymentAttempt.amount` in this engagement's Payments Freeze Audit. Under this environment's SQLite driver, an uncast decimal column deserializes as a native PHP float/int, which is then serialized to JSON as a bare number instead of a string.

This is worse than the Payments case: `App\Domains\Commerce\Promotions\Actions\EvaluatePromotionsAction::numeric(string $value): string` strictly type-hints its parameter as `string`, and the file declares `strict_types=1`. **Every real call to `POST /promotions/evaluate` — the actual Checkout discount-calculation code path — would throw a `TypeError` and crash for any Promotion with a set discount value, or any Promotion carrying a `minimum_order_amount` condition.** This was never caught before because no Promotion existed in this environment's database until this slice's own live verification created the first one.

Confirmed via live reproduction: the admin's own Edit-Promotion dialog surfaced `Expected string, received number` from Zod the moment a percentage promotion was reloaded for editing — the first visible symptom of the same underlying defect.

## 5. Bugs fixed

- `apps/backend/app/Domains/Commerce/Promotions/Models/Promotion.php` — added `'discount_value' => 'decimal:4'` and `'get_y_discount_percentage' => 'decimal:2'` to `casts()`.
- `apps/backend/app/Domains/Commerce/Promotions/Models/PromotionCondition.php` — added a `casts()` method with `'numeric_value' => 'decimal:4'` (the model had no `casts()` at all before).
- **Frontend, caused by the backend fix's own new fixed-precision strings** (e.g. `"10.0000"` instead of `10`): added `apps/admin/src/modules/marketing/shared/formatDecimal.ts` (trims trailing zeros/dangling decimal point) and wired it into `PromotionDetailPage.tsx`'s discount summary, `PromotionConditionsManager.tsx`'s condition summary, `PromotionFormDialog.tsx`'s edit-prefill, and `PromotionConditionDialog.tsx`'s edit-prefill — so a merchant sees "10% off" and "≥ 50", never "10.0000% off" or "≥ 50.0000". Unit-tested (`formatDecimal.test.ts`, 3 tests).

No other frontend defects were found — every other screen matched its real backend contract on the first live pass.

## 6. Live verification against the real backend

Logged in as `admin@nexgen.test`. No Promotions existed in this environment before this slice — every workflow below was exercised end-to-end for the first time against real, empty-to-populated backend state:

1. **Create**: a real `percentage` Promotion ("Live Verify Summer Sale", 10%, priority 5) via `POST /promotions` — appeared correctly in the List with the correct empty state honestly replaced.
2. **Add Condition**: a real `minimum_order_amount` condition (≥ 50) via `POST /promotions/{id}/conditions` — rendered correctly, `promotion.version` incremented.
3. **Add Coupon**: a real `SUMMER10` coupon via `POST /promotions/{id}/coupons` — rendered correctly with its own independent version.
4. **Checkout evaluation, the actual bug-fix proof**: called the real `POST /promotions/evaluate` directly with a $60 cart — before the fix this would have thrown a `TypeError` inside `EvaluatePromotionsAction`; after the fix it correctly returned `{"discountAmount": "6.0000", "totalDiscount": "6.0000"}` (10% of $60), confirming the real Checkout discount-calculation path now works end-to-end.
5. **Edit**: changed priority 5→9 via `PATCH /promotions/{id}` with `expected_version` — round-tripped correctly, `version` incremented to match.
6. **Archive**: `POST /promotions/{id}/archive` — status flipped to `archived`, the Archive button correctly disappeared (matches the `status === 'active'` guard), Edit/Delete remained available.
7. **Delete**: `DELETE /promotions/{id}` — confirmed via a direct follow-up `GET` returning `404`; the List correctly returned to its honest empty state.
8. **Redemptions**: confirmed the real, honest empty state ("No redemptions yet") since nothing was redeemed through Checkout in this session.
9. **Audit Log**: confirmed all four real actions (`promotion.created`, `promotion.condition_added`, `coupon.created`, `promotion.updated`) appeared with correct actor, timestamp, and humanized action label; the "View promotion" link correctly appears only on the two Promotion-targeted rows, not the Coupon/Condition rows.

Permission gating verified via the Playwright suite's own `mockPromotionsViewerOnlySession` (a real, narrower `promotions.promotions.view`-only role) rather than live, since constructing a second restricted staff account was out of scope for this pass — this mirrors every prior module's own established verification split (live CRUD, mocked permission-gating).

Responsive verified live at 375×812 (mobile) and 1440×900 (desktop) on List, Detail, and Audit Log — no horizontal page overflow at either width (the Audit Log's own table scrolls in its own container, matching every other module's established DataTable pattern); action buttons and cards stack cleanly on mobile.

## 7. Quality gates

| Gate | Result |
|---|---|
| `typecheck` | Clean |
| `lint` | Clean |
| Production `build` | Clean |
| Unit tests | **148 passing** (`apps/admin`) + **166 passing** (`packages/api-client`) — 7 new this slice (4 `auditAction` + 3 `formatDecimal`) |
| Playwright e2e | **9/9 passing** for `marketing.spec.ts` (List with Status filter, Create, Detail with Conditions/Coupons/decimal-trim, Edit, Archive+Delete, Redemptions empty state, Audit Log with resolved staff name + row navigation, permission gating, a11y scan across all four screens). Full platform suite: **158/165 passing** under parallel workers — the 5 failures matching this engagement's established `catalog-brands.spec.ts`/`catalog-product-slice2.spec.ts` baseline, plus 2 more (`pricing-tools.spec.ts`, `shipping-shipment-preparation.spec.ts`) reproduced as parallel-worker resource-contention flakiness and confirmed passing cleanly under `--workers=1` — zero Marketing failures, zero regressions in unrelated modules |
| Accessibility | 0 critical/serious violations across Promotions List, populated Promotion Detail, Redemptions, and Promotions Audit Log |
| Responsive | Verified live at 375×812 and 1440×900 |
| Live verification | Full CRUD lifecycle (Create → Condition → Coupon → **real Checkout evaluate** → Edit → Archive → Delete) plus Redemptions and Audit Log, all against the real backend, with one critical pre-existing bug found and fixed |

## 8. Readiness score: 97/100

The three points held back reflect the honest, backend-forced limitations in §3 (no cross-module picker for Conditions, no free-text search, no parent-linking from Coupon/Condition audit rows) — none fixable within this frontend-only slice, none worked around. The one critical bug found (§4) was root-caused and fixed at its actual source (missing backend decimal casts), not patched around client-side, and live-verified against the real Checkout evaluation endpoint that the bug would otherwise have crashed. All quality gates green except the established, pre-existing, unrelated flake baseline.

**Recommendation: READY, pending Product Owner review of §3's honest limitations and §4/§5's backend bug fix.**

---

**Not committed. Not pushed. Stopping here per the master task's own explicit closing line — do NOT commit Marketing, do NOT push Marketing, wait for Product Owner approval.**
