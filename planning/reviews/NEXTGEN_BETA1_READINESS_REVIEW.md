# neXgen Core — Beta 1 Readiness Review

**Date:** 2026-08-17
**Status:** Documentation only. No code, configuration, or backend contract was changed to produce this document, and nothing in it should be implemented without separate Product Owner authorization — per the master task's own explicit instruction that triggered it: *"IF CMS FINISHES EARLY: DO NOT START THE LANDING ENGINE. Instead create `NEXTGEN_BETA1_READINESS_REVIEW.md`... Do NOT implement anything. Documentation only."*
**Trigger:** Phase 3.1 (CMS) research (`planning/architecture/PHASE_3_1_CMS_ARCHITECTURE.md`) found zero CMS backend implementation exists — Slice 1 had no possible scope, satisfying this master task's own "finishes early" contingency.
**Basis:** This review synthesizes every freeze/architecture report produced across Phases 2.1–3.0 (`planning/reviews/*`, `planning/architecture/*`), re-reading each one rather than relying on summary alone, plus direct code inspection where a claim needed re-confirming.

---

## 1. Where the platform actually stands

| Layer | State |
|---|---|
| Backend (`apps/backend`) | 19 real Commerce/Operations/Platform modules built and tested in Phase 1 (pre-dates all frontend work). Growth-domain modules (Reporting, CRM, Marketing¹, Automation) and CMS are **designed for, not built** — `docs/04_MODULE_ARCHITECTURE.md` §7 says so explicitly. |
| Admin (`apps/admin`) | 8 business modules built and **frozen**: Catalog, Inventory, Pricing, Customers, Orders, Shipping, Payments, Marketing². Each built strictly against its own already-existing backend, each closed with a live-verified Freeze Audit. |
| Storefront (`apps/storefront`) | **Does not exist.** Not scaffolded. Zero customer-facing surface anywhere in this repository. |
| CMS / Theme Engine / Storefront Component Engine | Design-only Accepted documents (`docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md`, `THEME_ENGINE_ARCHITECTURE.md`, `STOREFRONT_COMPONENT_ENGINE.md`). Zero backend, zero frontend implementation. |
| Landing Engine | Not started. Explicitly named in the master overnight task as "Planned," never authorized for implementation this session. |

¹ "Marketing" as built in Phase 3.0 maps to the real `Commerce/Promotions` backend, a Commerce-domain module — **not** the Growth-domain `MODULE:MARKETING` this table's own accepted architecture reserves for a not-yet-built module. Both facts are true and non-contradictory; this distinction is documented in `PHASE_3_0_MARKETING_ARCHITECTURE.md` §1 and repeated here because it is easy to misread the table above as a contradiction.
² Phase 2.7 (Checkout) was scoped to architecture-research only, by explicit Product Owner direction — no Checkout admin UI was ever authorized or built. Checkout's own backend is real, complete, and already consumed live by Pricing, Promotions, and Orders — it simply has no dedicated admin screen of its own.

**In one sentence: neXgen Core today is a complete, production-grade back-office admin platform for an e-commerce business with zero public storefront.** Every "sell something to a customer" capability (Checkout, Promotions evaluation, tax/shipping calculation) is real and already exercised — by Orders being created, not by any customer-facing UI, since none exists.

---

## 2. Architecture

**Strength — the same shape, eight times, without drifting.** Every one of the 8 frozen modules independently arrived at an identical structure: a typed `packages/api-client/src/{module}/` REST layer, one `apps/admin/src/modules/{module}/module.ts` registering routes+nav through the single `registerModule()` seam (Admin Shell/router/sidebar never touched per-module), `RequirePermission anyOf={[...]} inline={null}` for control-level gating, optimistic locking threaded through every mutation via `expected_version`, and a dedicated per-module `*ErrorMessage`/`auditAction`/`formatCurrency`-style helper file (deliberately duplicated, not shared, per this codebase's own established convention). No module reached for a shortcut the others hadn't already validated. This is the single strongest signal that Beta-scale feature growth (Storefront, CMS, whatever comes next) can keep using this same pattern without a rewrite.

**Weakness — the pattern is convention, not enforcement.** Nothing currently stops a ninth module from silently diverging (e.g., inlining error messages instead of a `*ErrorMessage` helper, or gating a control with a raw `if (can(...))` instead of `RequirePermission`). No lint rule, no architecture test, no ADR formalizes "this is the shape every module must take." Recommended before RC1: an ADR naming this pattern explicitly (mirroring how `docs/04_MODULE_ARCHITECTURE.md` formalizes backend module boundaries), plus a lightweight `eslint` rule or Playwright a11y-style repo-wide check that would catch a module skipping `RequirePermission`.

---

## 3. Consistency & Module Cohesion

- **Optimistic locking, audit logging, and permission gating are uniformly real** across all 8 modules — none of them fake a 409, fake an audit row, or hide a control by disabling-not-hiding it. Confirmed by direct re-reading of each Freeze Report's own §"Optimistic locking"/§"Permission gating" section.
- **Terminology drifted once, and was caught**: Inventory Slice 2's own UX refinement pass (`PHASE_2_3_SLICE_2_REPORT.md`) found and fixed "Place hold"/"Note"/"hold" language that didn't match the rest of the module's own "Reserve stock"/"Reservation" vocabulary — a good example of the kind of drift that compounds if not caught early, and evidence this platform does catch it when it's looked for directly.
- **A shared-component bug was found and fixed at the root, not per-module**: Catalog's own Freeze Audit found `ConfirmDialog` (used for *every* destructive-action confirmation platform-wide) had no `catch` block — a rejected confirm (e.g., a real 409) silently did nothing. Fixed once, for every caller, immediately. This is the correct pattern; the WCAG contrast finding below shows the same class of shared-component bug being handled less consistently.
- **A shared pagination-cap bug recurred five times inside one module before being generalized**: Catalog's own Freeze Audit found the identical "selector silently caps at page 1" bug in five different places, fixed once via a new shared `useResourceListAll()` hook — again, correctly generalized. **Not yet verified whether any of the 7 modules built after Catalog have the same latent bug in any of their own selectors** (Customer/Order/Product pickers, staff-directory dropdowns, etc.) — flagged as a genuine open question for a future audit, not confirmed either way here.

---

## 4. Permission Model

Real, RBAC-based, backend-defined (`Authorization/PermissionRegistry.php` per module), consumed honestly by the frontend (`RequirePermission anyOf={[...]}`) everywhere checked. No module invents a permission key the backend doesn't define. The one structural risk: **the permission surface has grown to roughly 60+ distinct keys across 8 modules** (Catalog alone has 15) with no single admin screen to browse/audit them as a set — Identity & Access's own Roles screen (built in the Admin Shell foundation, Phase 2.1) is the only place a merchant can see the full list, and it was never re-audited for usability against a set this large. Worth a dedicated UX pass before Beta if role-configuration is expected to be a real merchant workflow, not just an initial-setup task.

---

## 5. Navigation

Eight top-level nav groups now exist (Catalog, Inventory, Pricing, Customers, Orders, Shipping, Payments, Marketing), each independently reasonable, collectively **starting to compete for sidebar real estate** — several groups already have 3–4 children (Pricing has Price Lists/Lookup/Checkout Preview/Missing Prices/Tax Zones/Tax Classes/Tax Rates = 7). No information-architecture review has ever been done across the *whole* sidebar as one artifact — each module's own `module.ts` was reviewed in isolation. Storefront/CMS/Landing Engine, whenever built, will add at minimum one more top-level group, likely more. **Recommended before RC1**: one dedicated IA pass across the full, current sidebar (not per-module) — candidates worth considering are grouping Pricing's 7 children under 2–3 sub-headings, or a global search-driven command palette (the Admin Shell already has a `⌘K` search affordance per every screenshot taken this engagement — confirm what it currently indexes and whether it could absorb some of this pressure).

---

## 6. Enterprise UX

The Design Foundation Refresh (`planning/reviews/PHASE_2_2_..` era through the dedicated refresh pass — typography scale, spacing tokens, Card/Table/Button/Dialog/Badge/EmptyState refinements) happened **once**, early, before Customers/Orders/Shipping/Payments/Marketing were built. Those five later modules were built *after* the refresh and used the refreshed tokens/components from the start — but **no dedicated visual-consistency screenshot review has been done across all 8 modules side-by-side** as one artifact; each module's own Freeze Audit only screenshot-reviewed itself. This is exactly the kind of check this master task's own "BETA1_UI_UX_OBSERVATIONS" contingency (in the Marketing phase's own master instructions) anticipated — that contingency never fired this session because Marketing did not finish early, so it has never actually been done. **Recommended as a genuine, concrete pre-RC1 action**: a dedicated side-by-side desktop+mobile screenshot pass across all 8 frozen modules' own List/Detail/Dialog patterns, looking specifically for spacing/typography/card/table/dialog inconsistencies the per-module reviews wouldn't have caught by construction (a module can look internally consistent and still diverge from its siblings).

---

## 7. Cross-Module Workflows

The real, live, working cross-module chains, confirmed by direct database/API verification (not just code reading) at some point across the 8 Freeze Audits:

- **Orders → Fulfillment**: `OrderPlaced → CreateShipmentOnOrderPlaced`, real, automatic.
- **Orders → Notifications**: real confirmation-email listener, confirmed live.
- **Payments → Notifications**: `PaymentCaptured → SendPaymentReceiptOnPaymentCaptured`, confirmed live by direct database query in the Payments Freeze Audit — a genuine `payment.receipt` row with correct amount/recipient.
- **Marketing → Checkout**: `POST /promotions/evaluate` is the real, live discount-calculation path — proven this phase by live-creating a Promotion and correctly discounting a real cart, with a critical bug (§9) found and fixed along the way.
- **Customers ↔ Orders, Customers ↔ Payments, Marketing ↔ Customers**: real, FK-less cross-domain UUID references, each with a working "View X" admin link, gated by the *target* module's own permission (a merchant without `customers.customers.view` never even sees the link render).

The one **broken, real, cross-module gap, found and never fixed** (out of every individual audit's own power, since each would require a backend change):

> **A shipment can be fully picked, packed, dispatched, and delivered on an Order that has already been cancelled, with no linkage or warning anywhere in the admin.** Discovered live during the Shipping Freeze Audit — a real shipment ran its entire lifecycle to `delivered` on an order cancelled days earlier. Root cause: Fulfillment's only real Orders integration is the one-way `OrderPlaced → CreateShipmentOnOrderPlaced` trigger; there is no `OrderCancelled` listener, and `Shipment` carries no live read of its Order's current status. **This is the single most severe finding across this entire engagement** — see §11.

The recurring, honest, lesser gap (found independently in *two separate* Freeze Audits, never fixed, same root cause both times):

> **`OrderNotificationsCard` (Orders, frozen) only ever queries `related_type=order`.** Both the Shipping Freeze Audit (`shipment.dispatched`/`shipment.delivered` notifications) and the Payments Freeze Audit (`payment.receipt` notifications) independently confirmed via direct API/database query that real, correctly-queued notifications exist and are simply invisible on Order Detail, because they're stored as `related_type=shipment`/`related_type=payment` respectively. A merchant looking at one Order today cannot see whether its shipment or payment notifications actually sent — they'd have to separately check each module's own Audit Log page. **A single real fix** (either broaden `OrderNotificationsCard`'s own query to accept multiple `related_type`s scoped to the same order, or add a real `order_id` derivation on the backend's own Notification model) would close both gaps at once. Recommended as the top cross-module UX fix for a future Orders touch-up phase.

---

## 8. Technical Debt

1. **The recurring missing-`decimal:X`-cast bug class (§9) is the platform's single largest concentration of technical debt.** Four separate instances found and fixed independently, across four different Freeze Audits, months apart in this engagement's own timeline, each treated as an isolated finding rather than a systemic one until this document. **No platform-wide audit of every `decimal` migration column against its owning model's own `casts()` has ever been run.**
2. **The backend Pest test suite has never actually run in this development sandbox**, confirmed as far back as the Catalog Freeze Report (§9 there) and reconfirmed this session (Marketing Freeze Audit, §6): `phpunit.xml` requires real MySQL, this sandbox only has SQLite. Every single one of the four decimal-cast bugs above is a direct, mechanical consequence of this exact gap — SQLite's dynamic typing silently accepts what MySQL's strict typing would have caught, and the backend's own real test suite (which targets MySQL, per ADR-0003) has therefore never actually exercised the code path that broke each time. **This is not four unrelated bugs; it is one untested seam that has failed four times.**
3. **`useResourceListAll()`'s own "fetch all pages sequentially" pattern has not been re-audited against the 7 modules built after Catalog** (§3) — a real, if currently unconfirmed, latent-bug risk.
4. **Known baseline Playwright flakiness (`catalog-brands.spec.ts` ×3, `catalog-product-slice2.spec.ts` ×2) has been the accepted, unchanged, unfixed baseline across every single Freeze Audit's own quality-gate table since Phase 2.2** — reproduced identically, by this document's own count, at least 6 separate times this engagement (Customers, Orders, Shipping, Payments, Marketing Freeze Audits, plus this session's own full-suite run). It has never once been root-caused. Low urgency individually (each audit confirms it's pre-existing and unrelated to that module's own changes), but six unresolved recurrences of the same named flake is itself a form of debt.
5. **Tax Class ownership remains a confirmed, unfinished backend capability** (`PHASE_2_4_PRICING_ARCHITECTURE_REVIEW.md`): no real workflow anywhere persistently assigns a Product's tax class; only `Checkout\CheckoutItem.tax_class_id` exists, optional and caller-supplied per cart-add. A recommended `Product.tax_class_id` reference was never implemented, pending separate Product Owner sign-off since it reopens the frozen Catalog schema.

---

## 9. Backend Limitations (confirmed, not assumed)

- **The recurring decimal-cast bug, itemized**: `PriceListEntry::effectivePrice()` (Pricing, found live during Pricing Slice 1) → `ShippingRate.amount` (Shipping, found and *deliberately left unfixed* during Shipping Slice 1, flagged only) → `Payment.amount`/`PaymentAttempt.amount` (Payments Slice 2, found and fixed, live-crashed the real Capture endpoint) → `Promotion.discount_value`/`get_y_discount_percentage`/`PromotionCondition.numeric_value` (Marketing Slice 1, found and fixed, live-crashed the real Checkout evaluation endpoint). **`ShippingRate.amount` is confirmed still unfixed as of this document** — the Shipping Freeze Audit named it as a real, minor, deferred backend finding rather than fixing it, since Shipping's own frontend correctly coerces either shape. Recommended: a single backend PR auditing every `decimal()` migration column platform-wide and adding the matching `decimal:X` cast wherever missing, closing this class of bug in one pass rather than waiting for it to crash a fifth real endpoint.
- **No CMS, Storefront, Theme Engine, or Landing Engine backend exists** (§1, and `PHASE_3_1_CMS_ARCHITECTURE.md` in full).
- **No Notifications integration exists for Marketing** (`CouponRedeemed`/`PromotionApplied` have zero listeners anywhere) — confirmed by grep, an honest, documented gap, not a frontend omission.
- **`BankTransferGateway`'s own config docblock mismatch** (Payments Freeze Audit): claims no credentials needed; the real `isAvailable()` requires three. Minor, real, undocumented-until-now.

---

## 10. Frontend Limitations (confirmed, not assumed)

- **No product/category/customer/store picker anywhere a raw id is accepted instead** — Promotion Conditions, the Marketing Tester's cart lines, Catalog's own Related-Products-adjacent flows. Consistently, honestly documented per-module as "no picker UI this slice" rather than silently worked around. A real, cumulative UX debt if a future phase wants merchants entering real UUIDs by hand less often.
- **No free-text search on several List endpoints** (Promotions, several Catalog taxonomy entities) — correctly matches the real backend's own absence of a search parameter, not a frontend gap, but still a real merchant-facing limitation worth knowing about as a set.
- **One confirmed, still-open WCAG AA contrast finding in a *shared* Design System component** (`PageHeader`/`EmptyState`'s own hardcoded description-text styling, ~4.37:1 against the 4.5:1 floor) — first surfaced by the Orders Freeze Audit, re-confirmed unrelated-to-Payments by the Payments Freeze Audit, **never fixed**, since fixing it means touching a frozen shared component used by every module at once — a genuine cross-module risk, correctly left to a dedicated Design System phase rather than patched in place by whichever audit happened to notice it next.

---

## 11. Beta / Production Blockers

Ranked by real merchant-facing severity, not by discovery order:

1. **P0 — Cancelled orders can still be fully shipped and delivered with zero warning** (§7). This is a genuine data-integrity and potential financial-loss risk (fulfilling and shipping product a customer already cancelled) the instant this platform sees real production order volume. **Recommended: block Beta traffic through Shipping/Fulfillment until a backend fix lands** (a `CancelShipmentOnOrderCancelled` listener mirroring the existing `CreateShipmentOnOrderPlaced` pattern, or a guard inside the workflow Actions themselves).
2. **P0 — No Storefront exists.** Not a bug, a scope fact: this platform cannot take a real customer order today without an internal/admin-only flow. Every downstream Beta plan depends on when Storefront work begins.
3. **P1 — The decimal-cast bug class (§8, §9) should be closed platform-wide, not module-by-module, before any further module is built on this same untested seam.**
4. **P1 — `ShippingRate.amount`'s own missing cast is the one known instance of this bug class still live and unfixed today.**
5. **P2 — Orders' own notification blind spot** (§7) — not a data-integrity risk, but a real, repeatedly-independently-discovered merchant-trust gap ("did the email actually send?" is unanswerable from the one screen a merchant would naturally check).
6. **P2 — the shared WCAG contrast finding** (§10) — a real accessibility compliance gap in a component every module renders, currently masked because no single audit "owns" fixing a shared component.

None of these require re-litigating what any individual module actually built — every one of the 8 Freeze Audits stands on its own merits. These are the cross-cutting items no single module's own scope could have closed.

---

## 12. Top 50 Improvements Before RC1

Organized by theme, roughly in priority order within each theme. Not all 50 are equally weighted — the numbered list is for tracking, not a ranking claim beyond the theme groupings and §11's own P0/P1/P2 markers.

### Data integrity & backend correctness (highest leverage)
1. Platform-wide audit: every `decimal()` migration column vs. its model's own `casts()` — close the recurring bug class in one pass (§8, §9).
2. Fix `ShippingRate.amount`'s own still-missing cast (§9) — the one confirmed-live instance of #1 today.
3. Backend fix for cancelled-order-still-shippable (§7, §11 P0) — the platform's single most severe finding.
4. Get real MySQL provisioned in whatever environment runs CI/pre-release testing — the backend's own Pest suite has never actually run against its real target database in this engagement's entire history (§8.2).
5. Root-cause the 6-times-recurring `catalog-brands.spec.ts`/`catalog-product-slice2.spec.ts` Playwright baseline flake (§8.4) — six accepted recurrences is itself worth 30 minutes of investigation.
6. Re-audit `useResourceListAll()`'s own sequential-fetch pattern against every selector built in the 7 post-Catalog modules (§3, §8.3).
7. Resolve Tax Class ownership (§8.5) — either build the recommended `Product.tax_class_id` reference or formally close the question as out-of-scope for v1.

### Cross-module UX
8. Fix `OrderNotificationsCard`'s own single-`related_type` query gap (§7) — one fix closes two independently-discovered findings at once.
9. `BankTransferGateway` config docblock correction (§9) — trivial, just needs doing.
10. Confirm/close the `CouponRedeemed`/`PromotionApplied` Notifications gap (§9) — decide once whether Marketing should ever integrate with Notifications, rather than leaving it silently absent.

### Design System & accessibility
11. Fix the shared `PageHeader`/`EmptyState` WCAG contrast finding (§10, §11 P2) — needs a Design-System-owning phase, not another per-module patch.
12. A dedicated cross-module visual-consistency screenshot pass (§6) — the "BETA1_UI_UX_OBSERVATIONS" review this master task's own Marketing-phase contingency anticipated but never triggered.
13. A full sidebar information-architecture pass across all 8 nav groups as one artifact, not per-module (§5).
14. Confirm the `⌘K` global search's current index coverage and whether it can absorb navigation pressure as more modules ship (§5).
15. A dedicated Identity & Access Roles-screen UX pass now that the real permission surface has grown past 60 keys (§4).

### Architecture governance
16. Write the ADR formalizing the "one `module.ts`, one api-client folder, `RequirePermission`, per-module error helper" pattern every one of the 8 frozen modules already independently converged on (§2) — currently convention, not enforcement.
17. Consider a lightweight lint/architecture-test check that would catch a future module skipping `RequirePermission` or a shared error-helper convention (§2).

### Documentation & traceability
18. This document itself — keep it updated as a living cross-cutting register rather than a one-time snapshot, the same way `PROJECT_STATUS.md` is kept current per-phase.
19. Confirm whether `TECHNICAL_DEBT_REPORT.md`/`PRODUCTION_READINESS_REPORT.md`/`SECURITY_REVIEW.md`/`PERFORMANCE_REVIEW.md` (all pre-date the entire admin frontend, backend-Phase-1-era) should be refreshed now that 8 real admin modules and their own cross-cutting findings exist, or formally superseded by this document plus the per-phase Freeze Reports.

### Storefront / CMS / Landing Engine dependency chain
20. **Decide, at the Product Owner level, whether CMS gets a real backend module before or after Storefront work begins** — `docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md`'s own `Page → Section → Block → Widget` model assumes CMS-authored content exists for the Theme Engine to render, so Storefront's own first real page (even a plain homepage) already implicitly depends on *some* answer to "where does this content live," even if that answer starts as "hardcoded, not CMS-authored" for a v1 Beta storefront.
21. If Storefront v1 Beta is meant to ship *before* a real CMS backend exists, explicitly decide and document a minimal, honest interim content story (e.g., theme-configured static content, not merchant-editable) rather than let the CMS gap silently block all Storefront work.
22. Scope a real `MODULE:CMS`/`MODULE:CONTENT` backend boundary in `docs/04_MODULE_ARCHITECTURE.md` before any backend implementation begins — per that document's own `MODULE:AUTHORITY` governance rule, which this phase's own research (`PHASE_3_1_CMS_ARCHITECTURE.md`) found had never actually been done for CMS specifically.
23. Once a real Media Library admin screen is authorized (an independent, non-CMS opportunity named in `PHASE_3_1_CMS_ARCHITECTURE.md` §8.2), it becomes a real building block CMS's own eventual Section/Block model can reuse rather than re-inventing asset selection.
24. Scope the Theme System (`planning/IMPLEMENTATION_MASTER_PLAN.md` #5) and SEO module (#30) — both are named dependencies of CMS & Landing Page Builder (#31) in the master plan and neither has any backend presence today either.

### Remaining items (lower individual weight, real nonetheless)
25. Re-verify the Inventory and Pricing modules' own Freeze Audit artifacts are saved under a discoverable, consistently-named file in `planning/reviews/` — this document's own research could not locate a `PHASE_2_3_INVENTORY_FREEZE_REPORT.md` or `PHASE_2_4_PRICING_FREEZE_REPORT.md` by that naming convention, though `PROJECT_STATUS.md`'s own table confirms both freezes happened and were approved; worth a quick housekeeping pass so every frozen module has one discoverable freeze artifact, not eight minus two.
26. Confirm live, for the record, whether Pricing's own known `ShippingRate`/`PriceListEntry` decimal gaps have any further undiscovered siblings inside Pricing's own remaining untested money fields (Tax Rate amounts, etc.) — Pricing was the *first* module this bug class was found in, before the pattern was recognized as recurring.
27. A dedicated pass confirming every module's own "View X" cross-module link (Customer, Order, Payment, Shipment) still resolves correctly now that 8 modules' worth of these links exist simultaneously — each was verified in isolation at build time, never as a full connected graph.
28. Confirm the staff-directory `staleTime` fix applied during the Customers Freeze Audit (§8's own precedent for "found once, should be checked everywhere") was in fact reused correctly by every later module's own `useStaffDirectory()` implementation, not re-introduced as a fresh N+1 pattern per module.
29. A dedicated review of every module's own "Does not implement" list (present in every Freeze Report) as one consolidated backlog, cross-referenced against actual merchant demand, rather than 8 separate lists nobody reads together.
30. Confirm optimistic-locking conflict messaging (`ConflictError` → "This was changed elsewhere...") reads naturally in every one of the 8 modules' own real UI copy — each module wrote its own version of this string independently; a consistency pass may find drift.
31. A dedicated keyboard-navigation/focus-order pass across all 8 modules as one connected session (tab from Dashboard through every nav group and back) — each module's own a11y scan was per-page, never a full connected traversal.
32. Confirm every module's own mobile (375px) responsive behavior still holds now that 8 modules' worth of nav children exist in the sidebar simultaneously — each was checked with only its own siblings visible at build time.
33. A load-test pass at genuinely large scale (100k+ products/orders/customers) across the now-connected set of modules — each module's own Freeze Audit tested its own scale claims in isolation (Customers explicitly noted 100k+ scale was simulated, not measured against real backend query plans).
34. Confirm the SQLite-vs-MySQL local-dev gap (§8.2) is documented in one canonical place (currently repeated near-verbatim across at least 5 separate Freeze Reports) rather than left to be rediscovered per-module.
35. A dedicated review of every module's own Export/Audit-Log CSV or data-export surface (Customers has one; check whether Orders/Payments/Shipping/Marketing should too, or whether the asymmetry is intentional and should be documented as such).
36. Confirm whether the Admin Shell's own Notifications bell (referenced as "Notifications — coming soon" in every screenshot this engagement has taken) has a real completion date, now that Notifications' own backend has been proven live-integrated with at least two modules (Orders, Payments).
37. A dedicated review of whether any of the 8 modules' own "no restore" entities (Promotions/Coupons, Pricing's four archivable entities) represent a real, recurring merchant pain point worth a platform-wide restore-capability backend addition, rather than a per-module absence each Freeze Audit independently confirmed and moved on from.
38. Confirm the Identity & Access module's own Roles screen (Phase 2.1 foundation, never revisited since) still correctly reflects every one of the ~60+ real permission keys the 8 later modules introduced.
39. A security-focused re-read of the pre-frontend `SECURITY_REVIEW.md` against the now-live admin surface — that document predates any admin screen existing at all.
40. Confirm `PRODUCTION_READINESS_REPORT.md` (also pre-frontend) is either refreshed or formally marked superseded by this document plus the per-phase Freeze Reports, so a future reader doesn't treat a Phase-1-era snapshot as current.
41. A dedicated review of whether the platform's own "Marketing" naming (real: Promotions) versus the architecture's own reserved Growth-domain "Marketing" naming (not yet built) creates real confusion for a Product Owner or future engineer skimming `PROJECT_STATUS.md` — consider a one-line disambiguation note added directly to that file, not just this review.
42. Confirm every module's own permission-viewer-only Playwright test (the `mock*ViewerOnlySession` pattern, present in Payments and Marketing at minimum) exists for every other module too, or explicitly note which modules still only verify permission gating via the full-access session plus code review.
43. A dedicated review of whether any module's own "honest empty state" copy has drifted in tone/format from its siblings (each was written independently, module by module).
44. Confirm the `formatDecimal`-style trailing-zero-trim pattern Marketing introduced this phase (in direct response to its own decimal-cast bug fix) should be retroactively applied to Pricing's/Payments'/Shipping's own currency displays now that their own underlying decimal casts are confirmed present (Payments, Marketing) or still-missing (Shipping, §9).
45. A dedicated review of whether `formatCurrency`/`formatDecimal`/`formatWeight`/`formatPercent` — four near-identical per-module numeric-formatting helpers this engagement has now built independently across Pricing, Payments, Marketing, and Shipping — should be consolidated into one shared, well-tested utility now that the pattern has repeated four times, rather than a fifth module reimplementing it a fifth time.
46. Confirm the dev-environment HMR-corruption artifact this session's own live verification repeatedly hit (`vite`'s "module already registered" errors after many hours of continuous edits, requiring a full reload to clear) is a known, documented quirk of the dev workflow rather than something a future session should mistake for a real app bug, as this session initially did before investigating (see `PHASE_3_0_SLICE_2_MARKETING_REPORT.md`'s own live-verification notes for the specific false-alarm this caused).
47. A dedicated review of whether the Redemption Timeline pattern Marketing introduced this phase (a scoped, embedded child-record history directly on a parent Detail page) is a pattern worth deliberately reusing elsewhere (e.g., an embedded Order history on Customer Detail already exists in spirit via "Recent Orders" — confirm the two patterns are consistent with each other).
48. Confirm every module's own `?xxx_id=` URL deep-link precedent (Orders' `?customer_id=`, Marketing's new `?promotion_id=`) is discoverable/documented in one place for future modules to follow, rather than each new module's own engineer needing to rediscover the precedent by reading Orders' source directly.
49. A dedicated review of whether the Promotion/Coupon Tester's own "genuine simulation, zero mutation, proven live via direct API calls" verification standard (this phase's own strongest verification precedent) should become the required bar for any future "preview/test" tool this platform builds (Pricing's own Checkout Price Preview predates this exact proof pattern and was not retroactively re-verified against it this session).
50. Schedule this document's own first follow-up review once Storefront work actually begins — everything in §11 and this section is accurate as of a platform with no public-facing surface; several priorities (especially the CMS/Storefront dependency chain, §12's own final theme) will need re-ranking the moment that changes.

---

## 13. What this document deliberately does not do

Per its own governing instruction: no code was written, no backend contract was touched, no UI was built, and the Landing Engine was not started. Every recommendation above is exactly that — a recommendation, for the Product Owner to prioritize, reject, or reorder. This document's only job is to make the platform's own accumulated cross-cutting knowledge visible in one place, since — as §12 item 50 itself names — no single per-module Freeze Audit was ever positioned to see across all 8 modules at once.
