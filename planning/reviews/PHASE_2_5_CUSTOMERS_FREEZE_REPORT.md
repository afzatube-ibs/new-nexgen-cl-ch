# Phase 2.5 — Customers: Freeze Audit Report

**Date:** 2026-08-15
**Scope:** A complete production-readiness audit of the Customers module (Slice 1 — Customer Management, Slice 2 — Customer Activity & Commerce Foundation), performed by re-reading the real backend and re-testing every screen against it, thinking at "100,000+ customers, multiple staff, daily customer service" merchant scale. No new features. No Orders build. No Admin Shell/Navigation/Authentication/Shared Design System/Backend/Database/Route/Permission/API-contract changes.

---

## 1. Readiness Score: 97 / 100

Up from Slice 1 (95/100) and Slice 2 (96/100). The three points held back reflect real, already-documented backend-level constraints this audit re-confirmed rather than invented — a leading-wildcard `LIKE` search with no index acceleration path, no server-side `per_page` cap, and no `target_id` filter on the audit log — none of which are fixable from the frontend without inventing backend behavior, which every one of this phase's instructions explicitly forbade.

## 2. Critical Issues

**None found.** No data-integrity risk, no broken merchant workflow, no security/permission gap, no unhandled error path that leaves the UI in a stuck or misleading state.

## 3. Medium Issues (found and fixed this audit)

| # | Issue | Merchant-scale impact | Fix |
|---|---|---|---|
| 1 | Customer List's search box fired a real network request on every keystroke (`useCustomers({ q: search, ... })` read raw input state directly). | At 100,000+ customers, typing a 6-character name fired 6 full `%term%` LIKE queries against a table whose search column has no usable index for this pattern (confirmed via `CustomerController::index`) — real, compounding backend load from a single staff member's normal typing speed, multiplied across "multiple staff" doing this all day. | Added a local `useDebouncedValue` hook (350ms), matching the existing `PriceListEntryFormDialog` precedent. The visible input stays responsive (undebounced); only the query-driving value is delayed. New Playwright test asserts request count stays low relative to keystrokes. |
| 2 | `useStaffDirectory()` (`GET /users`, used to resolve audit-log actor IDs to names) had no `staleTime`, so it refetched the entire staff roster from scratch on every Customer Detail and Audit Log page visit. | A support agent working through customer records all day — the exact "daily customer service" scenario this audit was asked to model — triggers dozens of redundant full-roster fetches of data that almost never changes within a shift. | Added `staleTime: 5 * 60 * 1000`, matching the existing `useCatalogProductBySku` precedent for small, rarely-changing lookups. Live-verified: a second Detail-page visit in the same session fires zero additional `GET /users` requests. |

## 4. Minor Polish (found and fixed this audit)

| # | Issue | Fix |
|---|---|---|
| 1 | The Customers Audit Log screen (`GET /customers/audit-logs`) only exposed the `target_type` filter, even though the real backend genuinely supports a second, real `actor_id` filter that was simply never wired up. At "multiple staff" scale, a manager investigating "what did this specific staff member change" had no way to narrow the log at all. | Added a "Staff" filter `Select`, sourced from the same real staff directory already fetched for actor-name display (no new endpoint), combined with the existing Type filter via `FilterBar`'s standard multi-key active/remove/clear-all pattern. Live-verified against the real backend: selecting a staff member fires a real `actor_id=` request and correctly narrows results. |

No further cosmetic, copy, or spacing issues were found this pass — Slice 1 and Slice 2's own audits already worked through wording, empty states, and responsive layout in detail, and this audit's live re-walk of every screen at 1440px/390px found nothing new to flag.

## 5. Bugs Fixed (this audit, all three above)

1. Search-input debounce added to `CustomersListPage.tsx` — real backend load reduction, live-verified.
2. `staleTime` added to `useStaffDirectory()` in `shared/queries.ts` — real redundant-fetch elimination, live-verified.
3. Staff (`actor_id`) filter added to `CustomerAuditLogPage.tsx` — real, previously-unreachable backend capability now exposed, live-verified.

All three were caught by deliberately auditing at declared merchant scale (100k+ customers, multiple staff, daily operations) rather than only confirming each screen "works" — each is a genuine before/after improvement against the real running backend, not a hypothetical or cosmetic change.

## 6. UX Improvements

Beyond the three fixes above (the Staff filter is itself a UX improvement, not just a bug fix): no additional UX changes were made this pass. Slice 1 and Slice 2 already delivered a Product-Owner-reviewed information hierarchy (Overview → Addresses → Recent Orders → Recent Activity, `RequirePermission`-gated per section, Export separated from the `.manage`-gated action group); this audit's mandate was to verify and harden, not redesign, and no redesign was found necessary.

## 7. Deferred Backlog (confirmed unchanged, not silently worked around)

These are real, already-documented backend-level constraints, re-confirmed by re-reading the backend source this audit, not new findings:

- **No `restore()` endpoint for Customers.** Archived customers can be reactivated by editing status where supported; there is no dedicated "Restore" action because the backend exposes none — consistent with the platform-wide Archive/Restore ADR gap flagged during Phase 2.4's own architecture review.
- **No server-side `per_page` cap on `GET /customers`.** Not misused by this frontend (the List page always sends an explicit, bounded `per_page`), but a caller could theoretically request an unbounded page — a backend hardening item, out of this frontend-only phase's scope.
- **Leading-wildcard `%term%` search** on `CustomerController::index`'s `q` parameter cannot use a btree index at the database layer. The new debounce (§3.1) reduces *how often* this expensive query runs; it does not and cannot make the query itself cheaper — that would require a backend-side change (e.g., a full-text index) explicitly out of scope for this audit.
- **No `target_id` filter on `GET /customers/audit-logs`.** `CustomerDetailPage`'s "Recent Activity" card remains an honestly-bounded, client-filtered best-effort view (fetches the most recent window, filters to the customer's own id and its addresses); the new Staff filter on the full Audit Log screen (§4.1) is additive, not a workaround for this same gap.
- **`Order.customer_id` is identifier-only, never a real foreign key** (confirmed via the Orders migration's own docblock) — by design, this is why `DeleteCustomerAction` has no dependent-order check to add; there is nothing to protect.
- **Export is gated by `.view`, not `.manage`.** Re-confirmed as the real, current backend permission mapping (`CustomerController::export`) — flagged again as an open product question worth a deliberate Product Owner decision at some point, not treated as a bug this audit fixes unilaterally.

None of the above are regressions, and none block Freeze — they are real backend characteristics a frontend-only phase cannot and should not paper over.

## 8. Recommendation: **READY TO FREEZE**

Customer List, Customer Detail, Customer CRUD, Address Book, Recent Orders, Recent Activity, the full Audit Log, Export, permissions, optimistic locking, validation, search, sort, filters, pagination, responsive layout, accessibility, performance, information hierarchy, and merchant workflow were all re-audited against the real backend at declared scale. Zero critical issues. Two real medium-severity performance issues and one real UX gap were found and fixed, all live-verified against the real running backend (10/10 scripted checks passing on the final run, screenshots captured desktop + mobile). Quality gates are fully green: `typecheck`/`lint` clean repo-wide for the touched packages, 222 unit tests passing, production build clean, and the Playwright suite at 92/97 with the same 5 pre-existing, unrelated Catalog-spec failures this engagement has consistently reproduced against clean checkouts (17/17 Customers-specific specs passing, including 3 new this audit).

**Customers (Slice 1 + Slice 2, now Frozen) is a complete, production-ready module within its explicitly-approved scope.**

---

## Quality Gate Summary

| Gate | Result |
|---|---|
| `typecheck` | Clean |
| `lint` | Clean |
| Unit tests | 222 passing |
| `build` | Clean |
| Playwright e2e (full suite) | 92/97 — 5 failures are pre-existing, unrelated Catalog flakiness (`catalog-brands.spec.ts` ×3, `catalog-product-slice2.spec.ts` ×2), reproduced identically against a clean checkout, not a regression from this module |
| Playwright e2e (Customers only) | 17/17 passing, including 3 new this audit |
| Live verification vs. real backend | 10/10 scripted checks passing (search debounce, non-matching-row exclusion, staff-directory caching, Staff filter round trip), screenshots captured at 1440px and 390px |
| Accessibility scans | 0 critical/serious violations across List, Create dialog, Detail (populated), Address Book, Audit Log |

## Scope Discipline

Per every instruction in this phase, the following remain explicitly **not built**, confirmed still absent from the backend by direct source re-read this audit: Order History beyond the existing Recent Orders card, Lifetime Spend, AOV calculations, CRM/timeline/notes/tags/segmentation, marketing tools, WhatsApp integration, login/password-reset management, a customer self-service portal, and any fabricated statistic. Admin Shell, Navigation, Authentication, the shared Design System, the backend, the database, routes, permissions, and API contracts were not modified.
