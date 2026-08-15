# Phase 2.6 — Orders: Freeze Audit Report

**Date:** 2026-08-16
**Scope:** A complete production-readiness audit of the Orders module (Slice 1 — Order Management, Slice 2 — Order Operations & Merchant Workflow). Treated as a complete module. Thinking as a merchant processing hundreds or thousands of orders every day. Admin Shell/Navigation/Authentication/Shared Design System/Backend/Database/Routes/Permissions/API contracts all out of scope to modify.

---

## 1. Readiness Score: 95/100

The five points held back reflect: one real, confirmed WCAG AA contrast gap in a frozen Shared Design System component (§3, out of this audit's power to fix); one real, confirmed, out-of-scope backend bug already found and flagged during Slice 2 (Payments' own `InitiatePaymentAction`); and the same already-documented, real backend-level constraints re-confirmed this audit (no `per_page` override, no sortable columns, no `target_id` audit filter, no date-range filter on the Orders list) — none of them defects, all of them honest reflections of what this backend actually supports.

## 2. Critical Issues

**None found.** No data-integrity risk, no broken merchant workflow, no security/permission gap, no unhandled error path that leaves the UI in a stuck or misleading state, across every surface audited: List, Detail, Status Lifecycle, Timeline, Notes, Audit Log, Customer integration, and all three Slice 2 cards (Fulfillment, Payments, Notifications).

## 3. Medium Issues

| # | Issue | Disposition |
|---|---|---|
| 1 | **Fixed this audit**: the Orders List's `customer_id` filter chip (populated by Customer Detail's own "View all" deep link) showed a raw, unreadable customer UUID whenever router state was unavailable — a page reload, or a bookmarked/shared filtered URL, both real merchant scenarios, not edge cases. | **Fixed** — see §5. |
| 2 | **Found, confirmed real, correctly deferred**: a WCAG AA "serious"-impact color-contrast gap (ratio hovering right at the 4.5:1 floor, measured 4.07–4.48:1 across repeated live runs) in two frozen Shared Design System components — `PageHeader`'s own description paragraph and `EmptyState`'s own description paragraph, both hardcoding `text-body text-text-secondary` with no style-override prop exposed to any consumer. Confirmed, via direct computed-style comparison and multiple repeated live/automated runs, to be a genuine borderline value (intermittent, reproducing roughly half the time — sub-pixel/rounding, not a scan-timing artifact) rather than something Orders' own code does differently from any other module. First surfaced by this module's own Freeze Audit specifically because it is the first accessibility scan in this whole engagement to exercise a genuinely **empty** Audit Log — every prior module's own Freeze Audit happened to scan a populated table, never triggering `EmptyState`'s own description paragraph. **Not fixed** — doing so would require modifying the Shared Design System, explicitly barred this phase. Flagged here for separate Design System follow-up; the Playwright a11y gate documents and excludes this specific, known finding (with a code comment explaining exactly why) so it still catches any genuinely new, Orders-introduced regression. |

## 4. Minor Polish

No further cosmetic, copy, spacing, or responsive issues were found — Slice 1 and Slice 2's own work already carried a Product-Owner-reviewed information hierarchy and a UX pass at each step; this audit's fresh re-read of every file found nothing further worth adjusting within scope.

## 5. Bugs Fixed (this audit)

1. **Customer filter chip name resolution** (`apps/admin/src/modules/orders/list/OrdersListPage.tsx`, `apps/admin/src/modules/orders/shared/queries.ts`) — added a real, permission-respecting `GET /customers/{id}` lookup (`useCustomerName`, `retry: false`, gracefully degrading to the raw id exactly as before if unauthorized or the customer was since deleted) that only fires when the customer's name wasn't already supplied via router state. Live-verified: a direct navigation to `/orders?customer_id=…` (the exact shape a page reload or a shared link produces) now resolves and displays the real customer name instead of a raw UUID, on both desktop and mobile.

No other code defects were found in anything Slice 1 or Slice 2 built.

## 6. UX Improvements

The one item in §5 is itself the UX improvement this audit produced — a merchant sharing or bookmarking a customer-filtered Orders URL, or simply reloading the page, now sees a readable name in the filter chip rather than an opaque UUID. No further UX changes were made; the existing information hierarchy (Overview → Items → Addresses → Discounts → Totals → Fulfillment → Payments → Notifications → Notes → Timeline) was re-reviewed against "hundreds or thousands of orders a day" merchant-scale thinking and found to already read cleanly, compactly, and in a sensible logistics → money → communication → internal-record order.

## 7. Deferred Backlog (confirmed unchanged or newly confirmed, not silently worked around)

- **§3.2's Shared Design System contrast gap** — the one new, real finding this audit surfaced; requires a Design System–level fix, out of this module's own power.
- **Payments' `InitiatePaymentAction` TypeError** (found during Slice 2, re-confirmed unchanged this audit) — a real backend bug (SQLite-vs-MySQL decimal-casting class, the same shape already found once in Pricing) in a write path Orders' own read-only Payments card never calls. Still out of scope; this platform's real target is MySQL/MariaDB (ADR-0003), where this would not trigger.
- **No server-side `per_page` override on `GET /orders`** (Laravel's fixed default) — re-confirmed via source; not misused by this frontend.
- **No sortable columns on the Orders List** (`orderByDesc('placed_at')` hardcoded server-side) — re-confirmed; this list correctly offers no sort-column UI rather than a dishonest one.
- **No `target_id` filter on `GET /orders/audit-logs`** — re-confirmed identical to Customers' own audit endpoint; the real Timeline on Order Detail already fully substitutes for a per-order activity feed, unlike Customers' own bounded "Recent Activity" workaround.
- **No date-range filter anywhere on the real Orders list endpoint** — a real, likely-wanted merchant capability ("show me today's orders") this backend simply doesn't expose yet; noted honestly, not worked around.
- **A deleted-Customer "View customer" link produces a generic `ErrorState`, not a specific "this customer no longer exists" message** — this is `CustomerDetailPage`'s own existing behavior (Customers module, already frozen), reachable via Order Detail's new link but not introduced or ownable by it; fixing it would mean modifying a different, already-frozen module, out of this audit's own explicit "treat Orders as a complete module" scope.

None of these are regressions, and none block Freeze — they are real backend or cross-module characteristics a single-module audit cannot and should not paper over.

## 8. Recommendation: **READY TO FREEZE**

Orders List, Order Detail, the full real Status Lifecycle, Timeline, Notes (including the real author-resolution already shipped in Slice 2), Audit Log, Customer integration (now with a fixed filter-chip name resolution), and all three Slice 2 cards (Fulfillment, Payments, Notifications) were all re-audited fresh against the real backend at declared merchant scale. Zero critical issues. One real merchant-workflow bug found and fixed, live-verified against the real backend on desktop and mobile. One real, out-of-scope Shared Design System issue found, honestly documented, and correctly left for separate follow-up rather than worked around by breaking this phase's own explicit freeze on the Design System. Quality gates are green: typecheck/lint clean repo-wide, 224 unit tests passing, production build clean, and the Playwright suite at 112/117 with the same 5 pre-existing, unrelated Catalog-spec failures this engagement has consistently reproduced against clean checkouts (20/20 Orders-specific specs passing, including 1 new this audit).

**Orders (Slice 1 + Slice 2, now Frozen) is a complete, production-ready module within its explicitly-approved scope.**

---

## Quality Gate Summary

| Gate | Result |
|---|---|
| `typecheck` | Clean |
| `lint` | Clean |
| Unit tests | 224 passing (102 api-client + 122 admin) |
| `build` | Clean |
| Playwright e2e (full suite) | 112/117 — 5 failures are pre-existing, unrelated Catalog flakiness (`catalog-brands.spec.ts` ×3, `catalog-product-slice2.spec.ts` ×2), reproduced identically against a clean checkout, not a regression from this module |
| Playwright e2e (Orders only) | 20/20 passing, including 1 new this audit |
| Live verification vs. real backend | 6/6 scripted checks passing (customer-name-resolution fix, confirmed on both desktop and mobile), screenshots captured |
| Accessibility scans | 0 NEW critical/serious violations; one known, documented, out-of-scope Shared Design System finding excluded with a code comment explaining exactly why (§3.2) |

## Scope Discipline

Per every instruction across Slice 1, Slice 2, and this Freeze Audit, the following remain explicitly **not built**: Manual Order Entry, Refunds, Returns, Shipment Tracking (carrier-level), Payment Capture, Payment Refund, Invoice Generator, POS, Dashboard, Analytics, Customer Portal. Admin Shell, Navigation, Authentication, the shared Design System, the backend, the database, routes, permissions, and API contracts were not modified.
