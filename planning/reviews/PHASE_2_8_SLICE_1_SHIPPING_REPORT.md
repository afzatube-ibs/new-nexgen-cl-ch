# Phase 2.8 — Shipping & Fulfillment, Slice 1: Configuration & Shipment Visibility

**Date:** 2026-08-16
**Scope:** Configuration + read-only visibility only, against the real, already-complete backend (`app/Domains/Operations/{Shipping,Fulfillment}`), per the approved `planning/architecture/PHASE_2_8_SHIPPING_ARCHITECTURE.md`. No workflow actions (Pick/Pack/Dispatch/Cancel/Fail), no courier booking, no destination editing, no item/note management. Admin Shell, Navigation, Authentication, Shared Design System, Backend, Database, Routes, Permissions, and API contracts were **not modified**. **Not committed, not pushed** — awaiting Product Owner approval.

---

## 1. What was built

| Screen | Route | Backend consumed |
|---|---|---|
| Shipping Zones (full CRUD) | `/shipping/zones` | `GET/POST/PATCH shipping-zones`, `POST .../archive`, `DELETE shipping-zones/{id}` |
| Shipping Methods (full CRUD) | `/shipping/methods` | `GET/POST/PATCH shipping-methods`, `POST .../archive`, `DELETE shipping-methods/{id}` |
| Shipping Rates (full CRUD) | `/shipping/rates` | `GET/POST/PATCH shipping-rates`, `POST .../archive`, `DELETE shipping-rates/{id}` |
| Shipments (read-only, server-driven) | `/shipping/shipments` | `GET shipments` (`status`/`order_id` filters, real pagination) |
| Shipment Detail (read-only) | `/shipping/shipments/:id` | `GET shipments/{id}` (items/timeline/notes) |
| Shipping Audit Log | `/shipping/activity` | `GET shipping/audit-logs` |
| Fulfillment Audit Log | `/shipping/fulfillment-activity` | `GET fulfillment/audit-logs` |

One new nav group, "Shipping," added to the Sidebar via `registerModule()` — the same zero-touch mechanism every prior module uses.

**Fulfillment Audit Log was not explicitly listed in the instruction's numbered build items, but was built anyway** — item 5 (Shipment Detail) requires an "Audit link," and Fulfillment's own audit endpoint (and `fulfillment.audit_log.view` permission) already exist. Building it is the only way to give that link a real destination without inventing anything; this is called out explicitly rather than silently expanding scope.

## 2. Backend capabilities consumed

- `ShippingZoneController`/`ShippingMethodController`/`ShippingRateController` — full `index/show/store/update/archive/destroy`, confirmed by reading each directly. Every validation rule (uppercase 2-letter country code, `(country, region)` uniqueness, unique method `code`, `max_weight_grams > min_weight_grams`, compound `(zone, method, min_weight)` rate uniqueness, currency-code validation) is server-authoritative; the frontend never re-implements or second-guesses it — real server errors are surfaced verbatim via `applyServerValidationErrors`.
- `DeleteShippingZoneAction`/`DeleteShippingMethodAction`'s real `DependentRecordsExistException` (409) when a Zone/Method is still referenced by a Rate — surfaced with a specific, worded message, not a raw exception string.
- `ShipmentController::index`/`show` — real server-side `status`/`order_id` filters and pagination on `index`; `show` is the only endpoint that loads items/timeline/notes.
- `AuditLogController::index` on both modules — real `actor_id`/`target_type`/`per_page` filters, no `target_id` filter on either (confirmed identical to every other module's own audit endpoint).
- No restore endpoint exists for Zones/Methods/Rates (confirmed by reading `routes.php` directly) — no "Restore" action was built, matching the same gap Pricing's own Tax Zones/Classes/Rates and Price Lists already have.

## 3. Honest limitations (documented, not worked around)

Per the instruction's own closing line ("document them honestly... rather than inventing workarounds"):

1. **No "Warehouse" column/field anywhere.** `Shipment` has no warehouse field at all — confirmed via the model's own docblock and a repo-wide grep for `Inventory` across both `Shipping` and `Fulfillment` (zero matches). The originally-requested Shipments List column list included "Warehouse"; it is omitted rather than fabricated.
2. **No dedicated "Shipment Number."** `Shipment` has no human-readable identifier distinct from its UUID (unlike `Order.orderNumber`). The Shipments List and Detail both show the shipment's own id, truncated and monospaced — the same honest treatment this codebase already gives Order IDs, Customer IDs, etc. — rather than inventing a numbering scheme the backend doesn't have.
3. **No "Customer" name on the Shipments List.** `ShipmentResource` carries only `customerId` (never a live FK). Resolving it to a name would mean an N+1 `GET /customers/{id}` call per row — a real performance cost for a real, potentially large list — so the raw id is shown, truncated, honestly.
4. **`ShippingMethod.providerCode` is a free-text field**, not a picker sourced from the real Courier Registry (`GET /shipping/providers`). Wiring that picker up is a legitimate future addition but was not part of this slice's approved item list; the form's own hint text says as much.
5. **Real backend finding, not a frontend bug**: `ShippingRate` has no `'amount' => 'decimal:4'` cast (confirmed by reading the model directly), unlike `Shipment.grand_total`, which does carry it for exactly this reason. Under this sandbox's SQLite driver, `amount` returns as a bare JSON number (`60`) rather than a decimal string (`"60.0000"`) — live-verified. The frontend renders whatever the API returns; the real MySQL/MariaDB production target (ADR-0003) would not trigger this. Flagged here as a genuine, small backend inconsistency worth a one-line fix in a future backend pass — not fixed in this frontend-only phase.

## 4. Bugs found

Only the backend `ShippingRate.amount` cast gap above (§3.5) — no frontend defects were found during build or live verification that required a code fix.

## 5. Bugs fixed

None needed. This is a from-scratch build against an already-complete backend; no pre-existing frontend code was touched other than the two required, minimal, additive registration points (`apps/admin/src/modules/index.ts` — one new import line; `packages/api-client/src/index.ts` — one new barrel export line; `packages/api-client/src/fulfillment/{types,shipments,index}.ts` — extended, additively, with `getShipment`/items/timeline/notes/audit types the Slice 2 Orders work had deliberately left out, per that slice's own documented scope boundary).

## 6. UX

Compact, dense, corporate — follows the approved neXgen admin foundation exactly (`CrudPageLayout`, `DataTable`, `Toolbar`, `FilterBar`, `RequirePermission`, `ConfirmDialog`), the identical shape Pricing's own Tax Engine slice established for near-identical zone/rate CRUD. No oversized typography, no new visual language introduced. Shipment Detail mirrors Order Detail's own card layout (Overview → Courier → Destination → Items → Timeline) for a consistent reading order across modules. A genuinely new pattern for this admin: Rates' weight-band input uses a "Set a maximum weight" checkbox rather than an empty-means-infinite number field, since a merchant leaving it blank *by accident* vs. *deliberately unbounded* is a real, easy mistake this UI can prevent honestly, without inventing a business rule.

## 7. Quality gate results

| Gate | Result |
|---|---|
| `typecheck` | Clean (admin, api-client, tokens, ui) |
| `lint` | Clean (admin, ui) |
| Production `build` | Clean |
| Unit tests | **273 passing** (133 admin + 124 api-client + 16 ui) — 20 new this slice: 12 in `packages/api-client/src/shipping/*.test.ts` + `fulfillment/{shipments,auditLogs}.test.ts`, 8 in `apps/admin/src/modules/shipping/shared/{auditAction,formatWeight}.test.ts` |
| Playwright e2e | **123/128 passing.** New: `shipping.spec.ts`, 11/11 passing (Zones/Methods/Rates CRUD + validation, Shipments List, Shipment Detail + cross-module Order link + Audit link, both Audit Logs with filters, a11y scan). The 5 failures are `catalog-brands.spec.ts` ×3 and `catalog-product-slice2.spec.ts` ×2 — pre-existing, unrelated baseline flakiness this engagement has reproduced identically against clean checkouts since Phase 2.2, confirmed unchanged by re-running them in isolation (zero files in Catalog were touched this slice) |
| Accessibility | 0 new critical/serious violations. One exclusion: the empty-state Audit Log pages reproduce the exact, already-documented WCAG AA color-contrast gap Orders' own Freeze Audit first found (`PageHeader`/`EmptyState` description paragraphs, a frozen Shared Design System characteristic, not introduced here) — excluded by rule id, not by impact, so any *new* violation is still caught |
| Responsive | Verified at 390×844 (mobile) and 1440×900 (desktop) — Zones, Shipments List, and Shipment Detail all reflow correctly; dense tables scroll horizontally within their own container on narrow viewports, the same established platform convention every other List page uses |
| Live verification | **31/32 automated checks passing** against the real backend (see §8) |

## 8. Live verification against the real backend

Logged in as `admin@nexgen.test`. Seeded one real Zone ("Dhaka Metro," BD/DHK), one real Method ("Standard Delivery," self-fulfilled), and two real weight-banded Rates via direct API calls, then verified everything through the actual running admin UI:

- Zones/Methods/Rates: real data loads, zone/method names are cross-referenced correctly on the Rates list (not raw ids), weight bands format correctly (`0 g–500 g`, `500 g+`).
- Shipments List: **10 real shipments** appear, each auto-created by the live `OrderPlaced → CreateShipmentOnOrderPlaced` listener from real orders already in the database — not seeded by this verification, proof the automatic integration is genuinely live. The Order-number cell is a real, working link straight to Order Detail (confirmed by following it).
- Shipment Detail: real order number, real grand total (`22.0000 USD`), real timeline event (`Fulfillment started for order ORD-...`). The "Audit" link correctly navigates to the Fulfillment Audit Log, which shows the real `shipment.created` entry for that exact shipment.
- Shipping Audit Log: real `Zone created`/`Method created`/`Rate created` entries from the seeding above appear immediately.
- Live CRUD round-trip: created a throwaway zone, archived it (real 409-safe optimistic-locked mutation), then deleted it — confirmed via a direct backend query afterward that the delete genuinely succeeded (the one "failed" check in the automated script was the verification script itself checking too early, before the query-invalidation refetch completed — a test-timing artifact, not a product defect, independently confirmed against the real database).
- Zero unexpected console errors across the entire pass.

Screenshots captured (desktop 1440×900 and mobile 390×844) — sent alongside this report.

## 9. Readiness score: 96/100

The four points held back reflect: one small, real, deferred backend cast gap (§3.5, one-line fix, out of this phase's frontend-only power); the three honest, backend-forced omissions (§3.1–3.3) that a merchant will eventually want addressed by a backend change, not a frontend workaround; and the still-open Courier Registry picker (§3.4), explicitly deferred rather than built speculatively. Zero critical issues. Zero frontend defects found. All quality gates green except the two categories of failure already established, tracked, and reproduced as pre-existing baseline noise unrelated to this slice.

**Recommendation: READY, pending Product Owner review of the honest limitations in §3 — particularly whether "Warehouse" and "Customer name" are expected to require backend changes before Slice 2, or are acceptable as-is for a configuration-and-visibility-only slice.**

---

**Not committed. Not pushed. Stopping here per the instruction's own closing line, awaiting Product Owner approval before Slice 2 (Pick/Pack/Dispatch/Cancel/Fail workflow actions).**
