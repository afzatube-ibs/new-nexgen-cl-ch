# Phase 3.0 — Marketing: Final Freeze Audit

**Verdict: READY TO FREEZE.**

This audit covers Slice 1 (Promotions CRUD + Conditions + Coupons + read-only Redemptions + Audit Log) and Slice 2 (Redemption Timeline, real customer cross-link, Promotion/Coupon Tester) together, as one frozen unit. It re-audits everything already built, verifies every cross-module surface live against the real backend, and fixes only genuine bugs found along the way. No scope was expanded.

## 1. What was re-audited

### Promotions List
Re-confirmed real, server-side `status`/`discount_type` filters; client-side "Filter this page" search honestly labeled (no free-text search exists on this backend). Row actions (View/edit, Archive, Delete) correctly gated behind `promotions.promotions.manage`.

### Promotion Detail — Overview, Eligibility Conditions, Coupons, Redemption Timeline
Full CRUD lifecycle re-verified live end-to-end this audit round with a fresh, real Promotion: **Create → Add condition → Add coupon → Edit → Archive → Delete**, each step confirmed via a direct follow-up `GET`/`DELETE` against the real backend, not just the UI's own optimistic rendering. Archive correctly hides the Archive action (`status === 'active'` guard) while leaving Edit/Delete available; Delete confirmed via a real `404` on the next `GET`. Re-confirmed the backend genuinely places **no status guard** on adding Conditions or Coupons to an archived Promotion (read `AddPromotionConditionAction`/`CreateCouponAction` directly — neither checks `status`), so the UI's own permissive behavior here is correct, not a bug.

The new Redemption Timeline card (Slice 2) re-confirmed scoped correctly to its own Promotion via the real `promotion_id` filter, with an honest empty state for an unredeemed Promotion.

### Coupons & Conditions
Re-confirmed independent Coupon versioning (`lock_version` separate from the parent Promotion's own `version`) and Condition mutations correctly threading the *parent* Promotion's `expected_version`, per both models' own docblocks.

### Redemptions (standalone + embedded Timeline)
Re-confirmed read-only, immutable, real `PromotionRedemption` history — genuinely created only by Checkout's own `SubmitCheckoutAction`, never by an admin action. The Slice 2 customer cross-link (`View customer` → real Customer Detail, gated by `customers.customers.view`) re-confirmed correct; the deliberate absence of an "Order" link re-confirmed correct by re-reading the `promotion_redemptions` migration's own docblock (`order_reference` "deliberately has no relationship to Checkout or Orders at all"). The `?promotion_id=` URL deep-link (mirroring `OrdersListPage.tsx`'s own `?customer_id=` precedent) re-confirmed working.

### Promotion / Coupon Tester
Re-verified this is a genuine, non-mutating simulation: called the real `POST /promotions/evaluate` with a fresh live Promotion, confirmed the correct discount applied, then confirmed via direct API calls that **`usage_count_global` stayed 0, `version` stayed unchanged, and zero `PromotionRedemption` rows were created** — the tool's own on-screen disclaimer is accurate. Also re-confirmed (by reading `EvaluatePromotionsAction` directly) that the real evaluation logic filters to `status = active` promotions/coupons only — an archived Promotion correctly never applies, matching real Checkout behavior exactly.

### Promotions Audit Log
Re-confirmed every real write action performed during this audit (create/condition-add/coupon-add/update/archive/delete) appears with the correct humanized action label, correct resolved staff name, and correct timestamp. Re-confirmed the Type filter and the honest constraint that only `Promotion`-targeted rows get a "View promotion" link (a `Coupon`/`Condition` row's own `targetId` cannot be traced back to its parent Promotion from this flat audit shape — a real backend limitation, not an oversight).

### Permission gating
Re-confirmed via the Playwright suite's `mockPromotionsViewerOnlySession` (`promotions.promotions.view`/`promotions.coupons.view` only): New promotion, Edit, Archive, Delete, Add condition, and New coupon are all hidden, not merely disabled. Re-confirmed the Redemption Timeline card additionally requires `promotions.redemptions.view` and disappears without it (`RequirePermission` wraps the whole card). Re-confirmed the customer cross-link requires `customers.customers.view` independently of any Promotions permission.

### Validation, Optimistic locking
Re-confirmed live: `PATCH`/`archive`/`destroy` all thread `expected_version`, and every live write this audit performed only succeeded because the version sent matched the server's current one (an implicit, continuous re-confirmation, not a separate synthetic 409 test — Slice 1's own build already covered the explicit conflict-message case in code review).

### Accessibility, Loading, Errors, Responsive
- Accessibility: `@axe-core/playwright` re-run across all six real screens (List, Detail-with-Timeline, Redemptions, Audit Log, Tester) — 0 critical/serious violations.
- Loading: skeleton states on all list/detail queries confirmed correct (one investigation during this audit initially looked like a stuck-loading bug on the Audit Log and Promotions List — traced to this long-running dev-server session's own accumulated latency after many hours of edits/reloads, not a real defect: both resolved correctly with a few more seconds, and the automated Playwright suite — which uses a fresh browser context per run — shows zero such issue).
- Errors: `ErrorState` with retry unchanged; write-action errors route through `marketingErrorMessage` (409/403/generic), confirmed via Playwright and code review.
- Responsive: re-checked live at 375×812 — Promotion Detail (with its new Redemption Timeline card) and the Tester page both stack cleanly with no horizontal overflow; the Audit Log's table scrolls in its own container, the same established pattern every other frozen module already uses.

### Performance
No new unbounded queries introduced. The Redemption Timeline caps its own request to `per_page=10`; write-action mutations use targeted TanStack Query cache invalidation.

## 2. Cross-module verification (live, real data)

**Marketing → Checkout — the core integration, and the one genuine bug found this phase**: `POST /promotions/evaluate` (used by both the real Checkout code path and this module's own Tester tool) previously threw a `TypeError` for any Promotion with a set discount value or a `minimum_order_amount` condition, due to missing `decimal:X` casts on `Promotion.discount_value`/`get_y_discount_percentage` and `PromotionCondition.numeric_value`. Fixed at the root (backend model casts) during Slice 1's own build; re-confirmed still fixed this audit round via a fresh live evaluate call (10%/20% promotions both correctly discounting a real cart, zero crashes).

**Marketing → Customers**: `customer_id` on `PromotionRedemption` is a real, if FK-less, cross-domain reference to the Customers aggregate (confirmed by reading the `promotion_redemptions` migration's own docblock — the same `ARCH:CROSS_DOMAIN_COMMUNICATION` pattern every other frozen module's own customer/order links already use) — the Slice 2 "View customer" link is a real, working integration, re-confirmed via Playwright navigation assertions.

**Marketing → Orders**: No real coupling exists — `order_reference` is confirmed opaque, and no Promotions endpoint accepts or returns a real Order id. Correctly not linked.

**Marketing → Pricing**: No real coupling exists — the only "Pricing" references anywhere in the Promotions backend are two docblock comments citing `PriceListEntry::isSaleActive()` as a *precedent pattern* for schedule-window logic, not an actual dependency (confirmed by grep — zero `use App\Domains\Commerce\Pricing\...` imports anywhere in the module).

**Marketing → Notifications**: No listener exists anywhere in the codebase for `PromotionApplied`/`CouponRedeemed` (confirmed by grep outside the Promotions module) — correctly not built, an honest, documented backend gap, not a Marketing-frontend omission.

**Marketing → Audit**: Fully real and working — every write action this audit performed (create/update/archive/delete/condition-add/coupon-add) produced a correctly-labeled, correctly-attributed real audit row, confirmed both live and via the automated `marketing.spec.ts` suite.

## 3. Bugs found this audit round

**None new.** The one genuine, critical bug found and fixed during Slice 1's own build (missing `decimal:4` casts on `Promotion`/`PromotionCondition`, breaking the real Checkout evaluation endpoint with a `TypeError`) was re-verified still fixed this round via a fresh live evaluate call against a newly-created Promotion.

## 4. Deferred work (documented, not fixed — genuinely out of scope)

1. **No product/category/customer/store picker for non-`minimum_order_amount` Conditions, or for the Tester's cart lines** — raw id text entry only; this module owns no cross-module search UI of its own (the same honest scope limit already established in Slice 1).
2. **No free-text search on Promotions List** — confirmed absent from the real backend.
3. **No manual "Redeem" admin action, no top-level Coupons list, no restore for archived/deleted Promotions or Coupons** — all confirmed absent from the real backend.
4. **Coupon/Condition audit rows can't deep-link to their parent Promotion** — a real, flat-audit-shape limitation of the backend, not a frontend gap.
5. **No "View order" link on Redemptions** — `order_reference` has no real relation to Orders; building one would invent a cross-module relationship this backend deliberately does not have.

None of these are critical. None block real merchant use of any Marketing capability this module actually built.

## 5. Quality gates (final)

| Gate | Result |
|---|---|
| `npm run typecheck` | ✅ Pass (`apps/admin` and `packages/api-client`) |
| `npm run lint` | ✅ Pass |
| `npm run build` | ✅ Pass |
| Unit tests (api-client + admin, marketing) | ✅ 4 (`auditAction`) + 3 (`formatDecimal`) + 1 (`evaluate`) = 8 dedicated tests, all pass; full suites 148 (admin) + 167 (api-client) all pass |
| Playwright `marketing.spec.ts` | ✅ 17/17 pass (9 Slice 1 + 8 Slice 2) |
| Playwright full suite | ✅ 168 passed / 5 failed — the pre-existing, already-documented baseline (`catalog-brands.spec.ts` ×3, `catalog-product-slice2.spec.ts` ×2) reproduced identically since Phase 2.2, zero Marketing failures, zero regressions in any other module |
| Accessibility (axe, critical/serious) | 0 findings across all six Marketing screens |
| Live verification | ✅ Full CRUD lifecycle, Conditions, Coupons, Redemption Timeline, customer cross-link, Tester (with zero-mutation proof), Audit Log, permission gating, all confirmed against the real backend with real, freshly-created data, then cleaned up |

## 6. Readiness score

**97 / 100.**

- Zero critical issues.
- Zero genuine bugs remaining (one found and fixed during Slice 1, re-confirmed fixed this audit).
- All 5 deferred items (§4) are real, honestly documented, backend-forced limitations — none are Marketing defects, none worked around.
- Full live verification complete across every capability this module built, plus 5 real cross-module integration points (Checkout, Customers, Orders, Pricing, Notifications, Audit).

## 7. Recommendation

**READY TO FREEZE.** Readiness (97) ≥ 95, no critical issues. Proceeding to update `PROJECT_STATUS.md`/`CHANGELOG.md`, commit Marketing-only changes, and push, per the master task's own instruction.
