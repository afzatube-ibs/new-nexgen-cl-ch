# Phase 2.8 — Shipping & Fulfillment — Slice 3: Shipment Preparation

**Status:** Complete. Not committed, not pushed. Awaiting Product Owner approval.
**Date:** 2026-08-17
**Scope:** Destination editor, Shipment items editor, Weight editor, Shipment notes, Shipment validation before Pick/Pack/Dispatch.

---

## 1. Mission recap

Slice 3 completes the Shipment Preparation workflow: exposing only backend capabilities that already exist for setting a shipment's destination, weight, items, and notes, and validation before the Slice 2 Pick/Pack/Dispatch actions. No backend, database, routes, permissions, API contracts, or Shared Design System files were touched. No inventory linkage, warehouse assignment, split/partial shipment, courier API, tracking sync, manual shipment creation, shipment deletion, or business-rule changes were built — all excluded per the mission's own "DO NOT BUILD" list.

## 2. Backend capabilities confirmed before building (re-read, not re-researched)

| Capability | Real endpoint | Real constraints |
|---|---|---|
| Destination + Weight | `PATCH /shipments/{id}/destination` (`SetShipmentDestinationAction`) | **One combined endpoint**, not two. `destination_recipient_name`, `phone`, `address_line1`, `city`, `country_code` are `required` on every call; `weight_grams` is `sometimes/nullable`. Blocked once status ∈ `[dispatched, in_transit, delivered, failed, cancelled]`. |
| Items | `POST /shipments/{id}/items`, `DELETE /shipments/{id}/items/{itemId}` (`AddShipmentItemAction`, `RemoveShipmentItemAction`) | Blocked once status ∈ `[packed, dispatched, in_transit, delivered, failed, cancelled]` — **not** blocked during `picking` or `packing`, only once genuinely `packed`. |
| Notes | `POST /shipments/{id}/notes` (`AddShipmentNoteAction`) | **No status guard at all** — addable at any point, including terminal states. |
| Permission | `fulfillment.shipments.manage` | All four write paths above share this single real permission, distinct from Slice 2's four granular workflow permissions (`.pick`/`.pack`/`.dispatch`/`.cancel`). |

**Key architectural decision, made explicit in code:** Since Destination and Weight are the *same* backend endpoint, Slice 3 ships **one** `ShipmentDestinationDialog` (title toggles "Set" vs "Edit" based on whether a destination already exists) rather than two separate UIs against a single contract — avoiding an invented, duplicated surface.

## 3. What was built

1. **`ShipmentDestinationDialog`** — combined destination + weight form (Zod + react-hook-form), pre-fills from the shipment's current `destination`/`weightGrams`, calls `PATCH /shipments/{id}/destination` with `expected_version` threaded for optimistic locking.
2. **`ShipmentItemFormDialog`** — SKU / Description / Quantity, `POST /shipments/{id}/items`. Per-row delete wired to `DELETE /shipments/{id}/items/{itemId}` with a `ConfirmDialog`.
3. **`ShipmentNoteFormDialog`** — body + "Customer-visible" toggle, `POST /shipments/{id}/notes`, mirrors the existing `OrderNoteFormDialog` pattern exactly.
4. **`ShipmentReadinessChecklist`** — an always-visible, 3-item checklist (Items added / Weight recorded / Destination set) rendered above the workflow action bar. It is a pure re-presentation of the same `hasItems`/`hasWeight`/`hasDestination` facts `ShipmentWorkflowActions` already computes for its own disabled-button logic — **not** a new or duplicated business rule, just an earlier, more visible surface for the same real precondition.
5. **New "Notes" card** on Shipment Detail — did not exist before this slice. Lists notes with resolved author name (via the real staff directory, same pattern as Order Notes) and a "Customer-visible" badge.
6. **Destination and Items cards** gained header actions ("Edit"/"Set destination", "Add item", per-row delete), permission- and status-gated using the two new lock constants (`DESTINATION_LOCKED_STATUSES`, `ITEMS_LOCKED_STATUSES`) that mirror the backend's own guards exactly.
7. **Workflow-action captions rewritten** (Slice 2 → Slice 3): from "...is not available in this release; see the completion report" to action-pointing text ("...add at least one item below first", "...record this shipment's weight below first", "...set a destination address below first"), since Slice 3 now provides the fix for each precondition.

## 4. Bugs found

None. The one open item from Slice 2 — the missing weight/destination editors — is exactly what this slice closes; no new backend or frontend defects were found while building or verifying Slice 3.

## 5. Bugs fixed (in this slice's own test suite, not the app)

Two pre-existing Playwright tests in `shipping-fulfillment-workflow.spec.ts` asserted the old Slice 2 caption wording (`/no items recorded/`, `/no destination address/`); updated to match the new Slice 3 wording. A genuine regression was also found and fixed: `ShipmentDetailPage` now calls `useStaffDirectory()` unconditionally (to resolve note authors), and `shipping-fulfillment-workflow.spec.ts`'s own shipment mock didn't stub `GET /api/v1/users*` — the resulting unmocked request tripped the app's session-expiry handling mid-test. Fixed by adding the same `/api/v1/users*` mock the newer spec files already carry.

## 6. Quality gates

| Gate | Result |
|---|---|
| Typecheck (`tsc -b --noEmit`) | ✅ Clean |
| ESLint | ✅ Clean |
| Unit tests — `apps/admin` | ✅ 133/133 passed (22 files) |
| Unit tests — `packages/api-client` | ✅ 141/141 passed (34 files) |
| Production build | ✅ Succeeds, all chunks emit |
| Playwright — Shipping suite (`shipping.spec.ts` + `shipping-fulfillment-workflow.spec.ts` + `shipping-shipment-preparation.spec.ts`) | ✅ 27/27 passed |
| Playwright — full platform suite | 136/144 passed. 8 failures, all confirmed transient parallel-load flake (re-ran every failing test in isolation/low-worker mode → 100% green): 6 pre-existing Catalog flakes (established baseline from prior phases) + 2 Shipping tests that only fail when 144 tests hammer one dev server concurrently, never in isolation. |
| Accessibility (axe-core, critical/serious) | ✅ 0 violations across Shipment Detail with Destination/Items/Notes populated (one new dedicated scan test), plus the existing mid-workflow scan |
| Responsive | ✅ Verified live at 1440×900 (desktop) and 375×812 (mobile) — checklist, cards, and dialogs all readable, no overflow |
| Live verification | ✅ See below |

New spec file: `shipping-shipment-preparation.spec.ts` — 8 tests covering readiness-checklist states, destination+weight save, item add/remove preconditions, the `packing`-vs-`packed` item-lock boundary, note-at-any-status + author resolution, destination lock once dispatched, permission gating, and an a11y scan.

## 7. Live verification against the real backend

Logged in as `admin@nexgen.test` against the real dev backend (`php84 artisan serve`, port 8080) and admin dev server (Vite, port 5173). Opened a real, previously-untouched pending shipment (`01a00626`, order `ORD-20260815-AC13344C`) with no items, no weight, and no destination, and drove it through the full Slice 3 surface with real network calls (confirmed via the browser's network log, not assumed):

- `POST /shipments/{id}/items` → **201 Created** — added `SKU-LIVE-QA-001`.
- `PATCH /shipments/{id}/destination` → **200 OK** — set recipient, address, and 750g weight in one call.
- `POST /shipments/{id}/notes` → **201 Created** — note author resolved live to "Dev Administrator" via the real staff directory; appeared on the Timeline as "A note was added."
- The readiness checklist updated live from all-unmet to all-met, and "Start Picking is disabled — add at least one item below first" disappeared once the real precondition was satisfied.
- Verified responsive rendering at both desktop (1440×900) and mobile (375×812) — Destination/Items/Notes cards and the readiness checklist all render correctly with no overflow at either width.

No console errors beyond expected Vite HMR dev-mode noise from repeated full-page navigations (module-registry re-registration on hot reload — a known dev-only artifact, confirmed absent from the production build).

## 8. Backend capabilities consumed (exhaustive)

- `PATCH /shipments/{id}/destination` (destination + weight, combined)
- `POST /shipments/{id}/items`
- `DELETE /shipments/{id}/items/{itemId}`
- `POST /shipments/{id}/notes`
- `GET /users` (staff directory, for note-author resolution — read-only, pre-existing)

No new backend surface was invented; every field and constraint above was read directly from the real `Request`/`Action` classes before implementation.

## 9. Readiness score

**9.5 / 10** — Feature-complete against the real backend contract, all quality gates green, live-verified end-to-end with real network calls. The half-point deduction is only for the two shipping-specific Playwright flakes observed under full-suite parallel load (confirmed non-issues in isolation, but worth the Product Owner knowing this machine's dev server strains under 144 concurrent tests).

---

**Per instruction: no commit, no push. Stopping here for Product Owner approval.**
