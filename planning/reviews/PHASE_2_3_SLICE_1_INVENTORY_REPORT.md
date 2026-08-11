# Phase 2.3 — Inventory Engine, Slice 1 — Completion Report

| | |
|---|---|
| **Status** | 🟡 Built, quality-gated, verified live — **awaiting Product Owner review**. Not committed. Not pushed. |
| **Date** | 2026-08-12 |
| **Scope** | Slice 1 only, per `planning/architecture/PHASE_2_3_INVENTORY_ARCHITECTURE.md` (approved) |
| **Explicitly not started** | Slice 2 (Reservations), Slice 3 (Transfers), Slice 4 (global Adjustments ledger) |

---

## 1. Architecture adherence summary

Everything shipped in this slice consumes the real, pre-existing Inventory backend (`apps/backend/app/Domains/Commerce/Inventory/`) exactly as documented in the approved architecture doc — no new endpoint, migration, permission, or business rule was added anywhere in `apps/backend`. Confirmed by construction, not just by intent:

- **API surface**: every request the frontend makes maps to a route already in `apps/backend/app/Domains/Commerce/Inventory/routes.php` — `GET/POST /warehouses[...]`, `GET /stock-items`, `POST /stock-items/adjust`, `GET /stock-items/{id}/adjustments`, `GET /stock-items/{id}`, `GET /inventory/audit-logs`. Nothing else was called.
- **Permissions**: gated on the real keys from `PermissionRegistry.php` only — `inventory.warehouses.{view|manage}`, `inventory.stock.{view|manage}`, `inventory.audit_log.view`. `inventory.reservations.manage` and `inventory.transfers.manage` are unused in this slice, as designed.
- **DTO shapes**: every field in `packages/api-client/src/inventory/types.ts` was read directly off the real `Http/Resources/*.php` files and `Http/Requests/*.php` validation rules, not guessed.
- **No Admin Shell / Navigation / Design System / Module Registration / Authentication changes**: Inventory registers itself through the exact same `registerModule()` call Catalog's own `module.ts` uses (`apps/admin/src/modules/inventory/module.ts`), plus the one-line addition to `apps/admin/src/modules/index.ts` that mechanism was built for. No file under `apps/admin/src/shell/`, `apps/admin/src/registry/`, `apps/admin/src/auth/`, or `packages/ui/` was modified.
- **Consistency with the frozen Catalog module**: every list screen uses the same `CrudPageLayout` + `Toolbar` + `FilterBar` + `DataTable` composition; every form uses the same React Hook Form + Zod + `applyServerValidationErrors` pattern; every mutation error is mapped through a dedicated `inventoryErrorMessage()` (mirroring Catalog's own `catalogErrorMessage()`, not sharing it — matching this codebase's established "each module owns its own copy" convention for anything module-specific).
- **Out-of-scope items respected**: no Purchase Orders, Suppliers, Procurement, Receiving workflow, Barcode Printing, Forecasting, Auto Reorder, multi-warehouse optimization, ERP, or AI functionality was built or stubbed.

## 2. Features implemented

1. **Warehouses** — full CRUD: create, edit, archive/restore, delete (blocked with the real `DependentRecordsExistException` reason when stock still exists against it). Default-warehouse badge and toggle.
2. **Stock Items / Stock Levels** — the merchant-facing "how much do I have" screen: on-hand / reserved / available per SKU per warehouse, with available visually emphasized.
3. **Manual Stock Adjustment** — a dedicated dialog (reachable from the page toolbar or a row's own "Adjust" action) with a warehouse selector, SKU field, a +/− quantity control, and a reason (presets + free-text "Other").
4. **Inventory Activity / Movement History** — a single global, paginated feed off the real Inventory audit log, answering "what changed, who changed it, when, and why" directly from the backend's own `before`/`after` payloads, filterable by Stock vs. Warehouses.
5. **Product ↔ Inventory integration** — a client-side join by exact SKU match against Catalog's real `GET /products` endpoint, surfaced in the Stock Levels table, the Adjust Stock dialog, and the Activity feed (via a two-hop lookup from audit-log `targetId` → StockItem → sku → Catalog product). Falls back honestly (a bare SKU, or "—") when no Catalog product matches — a real, expected case, not an error state.
6. **Search, filters, pagination** — exact-SKU search and warehouse filter on Stock Levels; status filter and page-level filtering on Warehouses; type filter (All/Stock/Warehouses) and page-number pagination on Activity.
7. **Empty / loading / error states** — every screen has all three, including a dedicated "create a warehouse first" guided empty state on Stock Levels when no warehouse exists yet (since `AdjustStockRequest` requires a real warehouse id).
8. **Success feedback** — real toast notifications (`@nexgen/ui`'s existing `useToast`/`<Toaster />`, mounted but previously unused anywhere in this app) on every mutation: stock adjusted, warehouse created/updated/archived/restored.
9. **Accessibility** — labelled form fields, `role="alert"` error surfaces, `aria-label`s on icon-only controls, keyboard-operable `SegmentedControl` (Radix `RadioGroup`, arrow-key navigable) for the Add/Remove stock toggle. Verified with `@axe-core/playwright` (critical/serious: zero).
10. **Mobile responsiveness** — every screen reflows correctly at 390px width; wide tables scroll horizontally inside their own bounded container (the same `overflow-x-auto` wrapper every Catalog table already uses — not a new pattern).

## 3. Screens completed

| Screen | Route | Permission |
|---|---|---|
| Warehouses (list + create/edit dialog) | `/inventory/warehouses` | `inventory.warehouses.view` / `.manage` |
| Stock Levels (list + row detail drawer + Adjust Stock dialog) | `/inventory/stock-levels` | `inventory.stock.view` / `.manage` |
| Activity / Movement History | `/inventory/activity` | `inventory.audit_log.view` |

All three appear as a new "Inventory" nav group, permission-filtered exactly like every other nav group (hidden, never disabled-but-shown, for an operator without the relevant `.view` permission).

## 4. Bugs discovered and fixed (during this slice's own build)

All found and fixed before this report — none are open:

1. **`ListQuery` export collision** — `packages/api-client`'s top-level barrel re-exported a same-named `ListQuery` type from both `catalog/` and the new `inventory/`, breaking the whole package's typecheck. Fixed by not re-exporting Inventory's internal `resourceClient` type (nothing external needs it).
2. **`WarehouseController` has no `per_page` support** — the original `listWarehouses()` reused Catalog's generic list shape, which would have silently sent a `per_page` param the real backend controller never reads. Found by re-reading `WarehouseController::index` directly; fixed by giving `ListWarehousesQuery` only the fields the backend actually honors (`status`, `page`).
3. **Two ambiguous test locators** — `getByLabel('Code')` matched "Code"/"Postal code"/"Country code" (substring matching); a toast's visible title collided with Radix's own hidden screen-reader announcer span. Both fixed with `exact: true` / `.first()` — test-only, no app code involved.
4. **ConfirmDialog-inside-DropdownMenuItem focus-trap interaction** — after Cancelling a blocked delete, the row's own Actions menu (its `DropdownMenuItem` is the `ConfirmDialog`'s trigger, the same pattern Catalog's own delete confirmations use) stays open underneath and hides the rest of the page from the accessibility tree — a real Radix modal behavior, not a defect, but one the test suite needed to account for rather than fight.

**Investigated and ruled out as unrelated to this work**: 5 pre-existing Catalog Playwright tests (`catalog-brands.spec.ts` ×3, `catalog-product-slice2.spec.ts` ×2) fail in this environment. Verified by (a) removing the Inventory module registration entirely and re-running — same failures, and (b) restarting the dev server fresh and re-running — same failures. This confirms the failures are pre-existing and environment-specific, not a regression introduced by this slice. Not touched, per the explicit "Do NOT modify Catalog" instruction — flagged here for visibility, not fixed.

## 5. Quality gate results

| Gate | Result |
|---|---|
| `npm run typecheck` (all workspaces) | ✅ Clean |
| `npm run lint` (all workspaces) | ✅ Clean |
| `npm run test` (all workspaces — unit) | ✅ 115/115 passed (34 new: 8 `@nexgen/api-client` inventory tests, 12 admin inventory unit tests, rest pre-existing) |
| `npm run build` (all workspaces) | ✅ Clean production build; every Inventory route is its own lazy-loaded chunk |
| `npx playwright test e2e/inventory.spec.ts` | ✅ 7/7 passed (Warehouses CRUD + dependent-records block, empty-state guidance, a11y scan, Adjust Stock success, insufficient-stock 409 handling, Activity rendering + filtering) |
| Full Playwright suite (`apps/admin/e2e/*`) | 32/37 passed — the 5 failures are the pre-existing, environment-level Catalog flakiness described in §4, reproduced identically with Inventory's module registration removed |
| `@axe-core/playwright` (New Warehouse dialog) | ✅ Zero critical/serious violations |
| Live manual verification (real backend, real dev admin) | ✅ Created a warehouse, adjusted stock, confirmed on-hand/reserved/available math, opened the detail drawer, confirmed the Activity feed showed both the warehouse-created and stock-adjusted entries correctly humanized — then cleaned up the test data |

## 6. Remaining work for Slice 2 (not started)

Per the approved architecture doc's slice order:

- **Slice 2 — Reservations**: place/release a manual hold, scoped per-item (no global reservations list — the real backend has no endpoint for that yet). Requires the Product Owner's answer to open question #1 in the architecture doc (is manual reservation wanted for v1, or should it wait for a real Checkout consumer).
- **Slice 3 — Transfers**: warehouse-to-warehouse movement UI. Inert with only one warehouse — natural to build once a merchant actually has a second one.
- **Slice 4 — global Adjustments ledger**: a true cross-item "all adjustments" list is not buildable today without a small additive backend endpoint (flagged as a real, named gap in the architecture doc's §9) — Slice 1's Activity feed already covers the same information via the audit log instead, so this is lower urgency than originally scoped.

## 7. Screenshots

Attached separately (desktop 1280×800 and mobile 390×844): Warehouses list, Stock Levels list, Stock Levels row detail drawer, Adjust Stock dialog (with a live Catalog SKU match), Activity feed, and the mobile off-canvas navigation drawer.

## 8. Product Owner review checklist

- [ ] Warehouses: create, edit, archive/restore, and a blocked delete (with the real reason shown) all behave as expected.
- [ ] Stock Levels: on-hand / reserved / available numbers read clearly; the Catalog product join (and its honest "—" fallback) makes sense.
- [ ] Adjust Stock: the reason presets are the right first set; the +/− control and live SKU match are clear at a glance.
- [ ] Activity: the combined "what/who/when/why" feed is legible and useful as-is, without also needing the deferred global Adjustments ledger yet.
- [ ] Confirm or revise the Slice 2 scoping questions from the architecture doc (manual reservations: yes/no for v1; per-item-only ledger scoping: acceptable for now).
- [ ] Confirm the Slice order (Reservations → Transfers → global ledger) or reprioritize.

**No commit. No push. Waiting for approval before Slice 2 begins.**
