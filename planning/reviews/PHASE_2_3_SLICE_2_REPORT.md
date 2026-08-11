# Phase 2.3 — Inventory Engine, Slice 2 — Stock Reservations (Build, then Product Owner UX Refinement Pass)

| | |
|---|---|
| **Status** | ✅ **Approved and frozen by the Product Owner (2026-08-12)** |
| **Date** | 2026-08-12 |
| **Scope** | Build: the Stock Reservation capabilities the existing Inventory backend already exposes. Refinement pass (same day): UX/UI wording and hierarchy only, on the already-built screens — no new features |
| **Explicitly not touched, either pass** | Backend, API contracts, database, permissions, routes, Admin Shell, Navigation, Authentication, Design System (`packages/ui`) |

---

## 1. Architecture adherence summary

Slice 2 consumes exactly the routes the real, already-complete Inventory backend exposes — nothing was added:

- `POST /stock-items/{stockItem}/reservations` (`inventory.reservations.manage`)
- `GET /stock-items/{stockItem}/reservations` (`inventory.stock.view`)
- `POST /reservations/{reservation}/release` (`inventory.reservations.manage`)

`POST /reservations/{reservation}/commit` exists on the backend but is deliberately **not** wired into any UI this slice — committing a reservation is an order-fulfillment concern, out of scope per the build brief's own "no order allocation, no ERP reservation logic" constraint.

No new nav item or route was added: there is no global, cross-item reservation-list endpoint on the backend, so a top-level "Reservations" page would have had nothing real to show. Reservations are surfaced as a second tab ("Reservations") inside the already-existing Stock Item detail drawer, next to the existing "Movement" tab — zero changes to `Navigation` or the route table.

The backend's `StockReservation.referenceType`/`referenceId` is a generic, nullable external-reference pair, never a foreign key. The UI's "Place hold"/"Reserve stock" action always writes a fixed `manual_hold` literal to `referenceType`, so a future system-created reservation (e.g. from Checkout) stays visually distinguishable from one a merchant placed by hand — a real distinction the backend's own data model already supports, not invented here.

All reservation-quantity math (`quantityAvailable`, `quantityReserved`) is read directly from the server response after each mutation — never recomputed client-side — consistent with the backend's pessimistic row-locking on `StockItem`. The UX pass's own client-side "would exceed available" warning (§5) is explicitly a non-blocking prediction from data already on screen, never a substitute for the server's own authoritative check.

## 2. Features implemented

- Reservation list, scoped to one Stock Item (no cross-item list endpoint exists)
- Reservation details: quantity, status, reference, held/expiry timestamps
- Reservation status: Active (actionable), Released, Committed — icon + color, never color alone
- Warehouse association: inherited from the parent Stock Item context the drawer is already scoped to
- Quantity reserved: shown both in the item summary header and per reservation
- Reservation reason: the merchant's own optional reference text
- Reservation lifecycle: Active → Released, a one-way UI action matching the backend's one-way state machine
- Reservation activity: `stock.reserved`/`stock.released` audit events render correctly in the existing Activity timeline
- Pagination, empty/loading/error states, success feedback, responsive behavior, accessibility — all present, matching Slice 1's established patterns

Reservation search/filters were not added beyond what already exists: the per-item scoping the drawer provides *is* the filter, since no cross-item reservation search endpoint exists to build one against.

## 3. Screens completed

- **Stock Item detail drawer → Reservations tab** — the list of holds for that item, with a "Reserve stock" trigger and a per-row Release action
- **Reserve Stock dialog** — quantity + optional reference, real-time validation, server-error surfacing
- **Activity timeline** — extended to render `stock.reserved`/`stock.released` entries with the correct icon, summary, actor, and timestamp

No new top-level pages — deliberate, per the architecture note above.

## 4. Bugs discovered and fixed

Five real bugs were found and fixed across the two passes, all via testing against the real backend, none assumed correct from a code read alone.

**Found during the build:**

1. **Pre-existing Slice 1 gap — committed-reservation Activity entries rendered with no summary.** `stockAdjustedDetails()` matched both `stock.adjusted` and `stock.reservation_committed` action types but only ever read `after.quantity_delta`. `CommitReservationAction`'s real audit payload is `{reservation_id, quantity}` — no `quantity_delta` key — so those entries had silently rendered blank since Slice 1 shipped. Fixed by branching per action type and deriving `delta: -quantity` for the committed case.
2. **New — `bg-feedback-info` + white text fails WCAG AA at caption size.** The reservation status badge's `Active` state used `bg-feedback-info text-white`, matching `danger`'s own treatment — but `feedback-info`'s color measures 4.09:1 against white, below the 4.5:1 floor. Caught live by this slice's own axe scan. Fixed to `text-black`, joining `success`/`warning` on the same already-established solid-badge pattern.
3. **New — Stock Item detail drawer went stale after placing or releasing a hold while open.** The drawer's header (`Available to sell`/`On hand`/`Reserved`) was driven by a frozen prop snapshot (`stockItem`, captured once at the moment the row was clicked), not the live `useStockItems` list query. The underlying query correctly invalidated and refetched, but the snapshot never followed. Invisible in Slice 1, since "Adjust stock" always closed the drawer before running — Slice 2's Reservations tab is the first place a quantity-changing action can happen *while the drawer stays open*. Fixed by deriving the displayed item live from the list (`stockItems.find(item => item.id === detailItemId)`) instead of holding a separate snapshot.

**Found during the UX refinement pass:**

4. **Shared wording bug — "can't remove N" is wrong for a reservation.** `inventoryErrorMessage()`'s `InsufficientStockException` translation is reused by both Adjust Stock (removing on-hand) and Reserve Stock (holding, not removing, anything). "Can't remove" read wrong for the latter. Reworded to a verb-neutral "Only X available — Y requested," accurate in both call sites — both the unit test and the Playwright assertions for *both* flows were updated to match.
5. **Invalid HTML in the implementer's own first draft.** The new `dl`-based stat-block markup nested a `<div>` inside another `<div>` inside `<dl>`, which the HTML5 content model for `<dl>` doesn't permit (each direct-child `<div>` must contain its own `dt`/`dd` pair directly, not further nesting). Caught during implementation, before delivery. Restructured to a flat, spec-valid layout using CSS Grid instead of a nested flex wrapper — same visual result, correct markup.

## 5. UX refinement pass — before / after

Requested by the Product Owner the same day as the build, before approval, with an explicit "UX only, nothing backend/contract/database/permission/route/Shell/Navigation/Auth/Design-System" constraint.

| | Before (build) | After (refined) |
|---|---|---|
| Trigger / dialog / submit label | "Place hold" | "Reserve stock" |
| Dialog content order | Quantity field first, no stock context shown | Available/On hand/Reserved shown first, quantity second, live "will remain Available" preview |
| Oversell feedback | Only after a failed server round trip | Immediate, non-blocking, from data already on screen — defers to the real server error once one arrives |
| Reference field | Labeled "Note," generic hint | Labeled "Reference," hint and placeholder with concrete merchant examples (offline order number, customer name, phone number, internal reference) |
| Row reference text | "Manual hold — {note}" / bare "Manual hold" | "Reference: {value}" / "No reference added" |
| Row timestamp label | "Held Today, …" | "Reserved Today, …" |
| Who reserved it | Not addressed on the row | Explicit "Who reserved this?" link to Activity, permission-gated on `inventory.audit_log.view` — the backend resource genuinely carries no actor field |
| Release toast | "Hold released" | "Reservation released" |
| Activity summary | "N units held" for both reserve and release | "N units reserved" / "N units released" |
| Available/On-hand/Reserved relationship | Three numbers, no stated relationship | Same three numbers + "On hand − Reserved = Available" caption |
| Stat block markup | Plain `Text` elements | Semantic `dl`/`dt`/`dd` |
| Release button accessible name | "Release" (ambiguous with multiple holds on one item) | "Release reservation of N units" |
| Shared insufficient-stock message | "can't remove N" (wrong verb when reserving) | "Only X available — Y requested" (accurate for both Adjust Stock and Reserve Stock) |

Terminology was standardized module-wide: "Place hold"/"Note"/"hold" language was retired everywhere it appeared — buttons, dialog titles, toasts, empty states, and the Activity feed's per-action summary verb — in favor of "Reserve stock"/"Reservation," consistently.

## 6. Quality gates

Run once after the build, then again in full after the UX refinement pass.

| Gate | Build result | Post-UX-pass result |
|---|---|---|
| Typecheck (all workspaces) | ✅ Clean | ✅ Clean |
| ESLint (all workspaces) | ✅ Clean | ✅ Clean |
| Production build | ✅ Succeeds | ✅ Succeeds |
| Unit tests | ✅ 143/143 (12 new) | ✅ 145/145 (2 more) |
| Playwright — Inventory suite | ✅ 17/17 | ✅ 17/17 (all updated for the new copy/behavior) |
| Playwright — full suite | 41/47 — 6 pre-existing failures in `catalog-brands.spec.ts`/`catalog-product-slice2.spec.ts`, confirmed unrelated by re-running against a stashed-clean Slice 1 baseline (identical failures reproduce with zero Slice 2 changes applied) | 42/47 — same 5 (one of the 6 didn't reproduce this run; not a regression) |
| Accessibility (axe, critical/serious) | ✅ 0 violations (Reservations tab, Reserve Stock dialog) | ✅ 0 violations, plus manually verified focus order (Quantity → Reference → Cancel → Reserve stock), visible focus rings, Escape-to-close |
| Responsive (390px / 1440px) | ✅ Verified | ✅ Re-verified |
| Live manual verification | ✅ Full reserve→release round trip, real oversell 409, all QA data cleaned up after | ✅ Repeated with the refined copy and the new client-side preview/warning, all QA data cleaned up after |

## 7. Live verification detail

Both passes ran against the real `php84 artisan serve` backend, never mocks, for the manual portion:

- Created a real warehouse and stock item, placed a real hold — `quantityReserved`/`quantityAvailable` updated correctly, Activity logged `stock.reserved`.
- Released the hold — quantities reverted, Activity logged `stock.released`.
- Attempted a hold exceeding availability — got the real `InsufficientStockException` 409, correctly translated.
- Confirmed the list shows active and terminal (released) reservations together, with the terminal one muted and its Release control gone.
- Post-UX-pass: repeated the full round trip with the refined dialog, confirmed the live "will remain Available" preview and the non-blocking early oversell warning both track the real numbers, confirmed the warning correctly steps aside once the real server error arrives instead of both being shown at once.
- Manually tabbed through the Reserve Stock dialog confirming logical focus order and visible focus rings; confirmed Escape closes it.
- All QA data (test warehouses, stock items, reservations, adjustments, audit entries) hard-deleted via `tinker` after each verification pass — the environment was returned to its pre-verification state both times.

## 8. Screenshots

Desktop (1440×900) and mobile (390×844) screenshots were captured against the real running backend for both the initial build and the refined UX pass, and delivered to the Product Owner directly in-session. Not committed to this repository, consistent with this project's existing convention (no prior phase's screenshots are committed either).

## 9. Remaining work for Inventory

Not started, per the Product Owner's own "do not begin Slice 3" instruction. For planning reference only:

- `POST /reservations/{id}/commit` has no UI yet — order-fulfillment-triggered, likely belongs with a future Orders integration rather than a manual Inventory action.
- No reservation `expiresAt` is ever set by any UI path today (the backend field exists but nothing populates it) — a product decision on whether manual holds should support an optional expiry is still open.
- Stock Transfers (between warehouses) and a global, non-page-scoped Adjustments/Reservations ledger remain named, deferred gaps from Slice 1's own report.
- A real backend-configurable low-stock threshold, and any Purchase Order/Supplier/ERP capability, remain out of scope for this phase entirely.
- The 5–6 pre-existing `catalog-brands.spec.ts`/`catalog-product-slice2.spec.ts` Playwright failures (unrelated to Inventory, confirmed via baseline comparison both times) should be triaged separately.

## 10. Outcome

**Phase 2.3 Slice 2 — Stock Reservations was approved and frozen by the Product Owner on 2026-08-12.** Committed and pushed to `origin/main` the same day, excluding the permanent local-only SQLite compatibility migration per this project's standing exclusion rule. Phase 2.3 — Inventory Engine now covers Warehouses, Stock Levels, Manual Stock Adjustment, Activity, and Stock Reservations, all Product-Owner-approved. **Slice 3 has not begun** — awaiting separate Product Owner direction.
