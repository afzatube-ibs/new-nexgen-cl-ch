# Phase 2.3 — Inventory Architecture & Product Design

| | |
|---|---|
| **Status** | 🟡 Draft — awaiting Product Owner approval. **No implementation code has been written.** |
| **Date** | 2026-08-11 |
| **Author** | Engineering (planning pass, per Product Owner's Phase 2.3 kickoff brief) |
| **Scope** | Design only: entities, relationships, workflows, merchant UX, API mapping, permissions, audit strategy, performance, extensibility, readiness/implementation plan |
| **Explicitly not in scope** | Any React/PHP implementation code, any new backend endpoint, any schema change |

---

## 0. Framing: this is a UI design pass on a real, complete backend

Before anything else, the single most important fact this document is built on: **`apps/backend/app/Domains/Commerce/Inventory/` already exists, is fully implemented, and ships with 19 other Phase 1 backend modules** (`PROJECT_STATUS.md` row 11: *"Inventory & Multi-Warehouse — ✅ Complete — built ahead of its master-plan sequence position"*). This is the same situation Catalog was in before Phase 2.2: a real backend contract with **zero admin UI** consuming it yet (`apps/admin/src/modules/` has no `inventory/` folder; `packages/api-client/src/` has no Inventory wrappers).

So "produce the complete Inventory Architecture & Product Design" is **not** an invitation to design a new inventory engine from scratch. Per this engagement's standing rule ("do not invent backend APIs, stay within the existing architecture"), the entities, state machines, and API surface below are **read directly from the real code**, not proposed. What *is* genuinely new design work, and where "think like Shopify/Dynamics/Odoo/NetSuite/SAP B1" actually applies, is:

- How a merchant *navigates and works with* these real entities (screens, flows, information architecture) — the UI/UX layer.
- How to **sequence** the build so it's usable at each step, not just technically complete at the end.
- What **world-class systems get right conceptually** (not visually) that this design should reflect — e.g. adjustments always require a reason, reservations are a distinct first-class object from on-hand stock, transfers are their own auditable workflow, everything is append-only where it represents money/stock movement.
- What is honestly **deferred**, and why — because the backend, deliberately, does not do everything a mature inventory system eventually does (no reorder points, no cycle counts, no barcode scanning, no supplier/PO tie-in — that's `MODULE:SUPPLIER_MANAGEMENT`, Phase 2 per the master plan, a different module entirely).

---

## 1. Entities (ground truth from the real schema/models)

### 1.1 `Warehouse`
The physical or logical stock-holding location. Phase 1 ships with exactly one (the merchant's single default location), but the schema is multi-warehouse-shaped from day one — there is no "Phase 2 migration" to multi-warehouse, only "stop assuming there's just one."

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `code` | string, unique | `alpha_dash`, e.g. `MAIN`, `DHK-01` |
| `name` | string | |
| `address` (`line1`/`line2`/`city`/`region`/`postalCode`/`countryCode`) | nested | all nullable |
| `isDefault` | bool | exactly one warehouse may be default at a time — enforced by `CreateWarehouseAction`/`UpdateWarehouseAction`, which unset any prior default in the same transaction |
| `status` | `active`\|`archived` | soft, reversible |
| `version` (`lock_version`) | int | optimistic-locking token, required as `expected_version` on update/archive/destroy |

Soft-deletable (`SoftDeletes`), restorable. Hard delete blocked (`409`) while `stockItems()->exists()` — a warehouse that ever held stock cannot be deleted, only archived, preserving history.

### 1.2 `StockItem`
The stock record for one SKU in one warehouse — the core aggregate everything else hangs off. **Deliberately keyed by `sku` (string), never a Catalog foreign key** — Inventory has no schema-level awareness of Catalog's `products`/`product_variants` tables at all.

| Field | Notes |
|---|---|
| `warehouseId` | FK → Warehouse |
| `sku` | string, matches a Catalog `Product.sku` or `ProductVariant.sku` by *value*, not by reference |
| `quantityOnHand` | the physical count |
| `quantityReserved` | held against active reservations — maintained transactionally on every reserve/release/commit, never recomputed by summing reservations on read |
| `quantityAvailable` | **computed**, `on_hand − reserved`, via `StockItem::available()` — never stored |
| `version` (`lock_version`) | present on the model, but `AdjustStockAction`/`ReserveStockAction`/etc. use **row-level pessimistic locking** (`lockForUpdate()`), not optimistic `expected_version` checks — see §5 |

A `StockItem` row is created lazily: `AdjustStockAction` creates one the first time a SKU is adjusted in a warehouse if none exists yet; `CompleteStockTransferAction` creates the destination one on first transfer in. There is no direct "create a stock item" endpoint — a stock item comes into existence only as a side effect of a real stock event, never as a bare record.

### 1.3 `StockReservation`
A **temporary hold** against a `StockItem` — reduces `quantityAvailable` without touching `quantityOnHand`.

| Field | Notes |
|---|---|
| `stockItemId` | FK |
| `quantity` | |
| `referenceType` / `referenceId` | generic external-reference pair, e.g. would hold `App\Domains\Commerce\Checkout\Models\CheckoutSession::class` + an id once Checkout exists. For a `StockTransfer`-initiated hold, `referenceType = StockTransfer::class`. **Not a foreign key** — Inventory never depends on Checkout's schema. |
| `status` | `active` → `released` \| `committed` (terminal, one-way) |
| `expiresAt` | nullable — column exists, but **nothing in the current codebase sets or sweeps it yet** (no scheduled command analogous to Checkout's `checkout:expire-sessions`). Flagged explicitly in §9 as a real gap once reservations get a live writer. |

No `lock_version` of its own — its whole lifecycle is state transitions performed under the *parent* `StockItem`'s row lock.

### 1.4 `StockAdjustment`
An **immutable, append-only ledger row** — every correction to `quantityOnHand` for any reason (manual adjustment, reservation commit, transfer in/out). No `updated_at`, no soft-delete, no `lock_version` — physically cannot be edited or deleted through Eloquent's own conventions, matching `SECURITY:AUDIT_LOGGING`'s explicit floor for stock manipulation ("a direct fraud vector").

| Field | Notes |
|---|---|
| `stockItemId` | FK |
| `quantityDelta` | signed int — positive (receiving, transfer-in) or negative (damage, transfer-out, reservation commit) |
| `reason` | free-text string, **required** on manual adjustment; system-generated reasons (`reservation_committed`, `stock_transfer_out`, `stock_transfer_in`) on the automatic paths |
| `actorId` | nullable (system-triggered rows may have none) |

### 1.5 `StockTransfer`
Movement of one SKU between two warehouses — its own state machine, not just two adjustments.

| Field | Notes |
|---|---|
| `fromWarehouseId` / `toWarehouseId` | must differ (`different:from_warehouse_id`) |
| `sku` | |
| `quantity` | |
| `status` | `pending` → `completed` \| `cancelled` (terminal) |

### 1.6 `AuditLog` (module-local, table `inventory_audit_logs`)
Flat, append-only action log — `actorId`, `action` (dotted string, e.g. `stock.adjusted`, `warehouse.archived`), `targetType`/`targetId`, `before`/`after` (JSON), `correlationId`. Same shape and same architectural pattern as Catalog's own audit log; **not** a per-field revision history, matching Catalog's precedent.

### 1.7 Entity relationship diagram

```
Warehouse (1) ──────< StockItem (N)  [one row per SKU per warehouse]
                          │  \
                          │   \── available() = on_hand − reserved  [computed, not stored]
                          │
                          ├──< StockReservation (N)  [active|released|committed]
                          │        └── referenceType/referenceId → external aggregate (nullable, generic — e.g. future CheckoutSession, or a StockTransfer)
                          │
                          └──< StockAdjustment (N)  [append-only ledger: every on-hand change, ever]

StockTransfer  ── from_warehouse_id ──> Warehouse
               └─ to_warehouse_id   ──> Warehouse
               (sku is a plain string, not a StockItem FK — the two StockItem rows it
                affects are resolved by warehouse_id + sku at execution time)

Catalog.Product / Catalog.ProductVariant
   sku (string) ⇠ ⇠ ⇠ value-matches ⇠ ⇠ ⇠  StockItem.sku
   (no schema relationship — resolved only by the Admin UI joining two independent
    API responses client-side, exactly like Organization tab already joins Products
    ↔ Categories/Collections/Tags today)
```

---

## 2. World-class inventory system thinking, applied to *this* design

Not UI-copied from anyone — these are the underlying principles that show up in every mature inventory engine (Shopify, Dynamics 365 SCM, Odoo Inventory, NetSuite, SAP B1), mapped onto what neXgen's real backend already enforces or should surface:

1. **On-hand vs. reserved vs. available are three different numbers, always shown together.** Every system above treats "available to sell" as a derived value, never lets a merchant edit it directly. neXgen's backend already enforces this at the data layer (`available()` is computed); the UI's job is to never let it look editable, and to always show all three side by side so a merchant understands *why* available is lower than on-hand.
2. **Every on-hand change has a reason, permanently.** SAP B1's "goods issue/receipt" reason codes, Odoo's "inventory adjustment reason," Shopify's adjustment reason dropdown — all exist because "we lost 3 units" and "a customer returned 3 units" look identical as a bare `+3`/`-3` without one. neXgen's backend already requires `reason` as a string on every manual adjustment (`AdjustStockRequest`); the design below treats this as a first-class, visible field, never a buried afterthought.
3. **Reservations are not soft-deleted stock — they're a distinct object with its own lifecycle**, visible independently of the stock item. This is exactly `StockReservation`'s shape already. The UX should let a merchant see *what* is holding their available stock down, not just a lower number.
4. **Transfers are a workflow, not two independent adjustments.** Every mature system models warehouse-to-warehouse movement as "in transit" with its own state, not "subtract here, add there" as one atomic click — because in the real world, goods are in a truck for days. neXgen's `pending → completed` state machine already reflects this (`InitiateStockTransferAction` only holds the source; nothing lands at the destination until `CompleteStockTransferAction`). The UX must show "in transit" as a real, visible status, not hide the two-step nature of it.
5. **Everything that touches stock quantity is audited, and the audit trail is boring and complete, not summarized.** No mature system lets you "clean up" adjustment history. neXgen already enforces this at the model level (`StockAdjustment` is uneditable); the UX must never offer a "delete this adjustment" affordance, because the backend has none to call.
6. **Multi-location is a *view filter*, not a separate mode.** Odoo/NetSuite/Dynamics all let you pivot instantly between "all locations" and "this location" on the same screens rather than routing you through a totally different multi-warehouse UI once you have more than one. Given the schema is already multi-warehouse-shaped, the Phase 1 UI (§4) is designed with a warehouse-scoping pattern that costs nothing extra when there's only one warehouse and needs zero rework when a merchant adds a second.

---

## 3. Workflows / state machines (grounded in the real Actions)

### 3.1 Warehouse lifecycle
```
create ──> active ──archive──> archived ──restore──> active
              │                                          
              └──delete (only if it never held stock; else 409 "still has stock items recorded against it")
```
Setting `isDefault: true` on create/update atomically unsets it on every other warehouse in the same transaction — there is never a moment with zero or two defaults.

### 3.2 Stock adjustment (manual correction / receiving)
```
merchant picks warehouse + SKU + quantity_delta (±) + reason
        │
        ▼
StockItem row locked (lockForUpdate) ── if none exists yet, created on the fly
        │
        ▼
would on_hand + delta go negative? ── yes ──> 409 InsufficientStockException, nothing written
        │ no
        ▼
on_hand updated, StockAdjustment row appended, AuditLog row appended, StockAdjusted event published
```
Concurrency note: two simultaneous adjustments to the *same* `StockItem` **serialize** (second waits for the first's row lock, then re-reads) rather than one rejecting the other with a conflict error — correct behavior for "two people receiving the same delivery," wrong mental model if the UX implies optimistic-locking conflict handling here. **No `expected_version` field on this endpoint** — don't design a version-conflict UI for it.

### 3.3 Reservation hold → release or commit
```
active ──release──> released   (stock freed back to available, nothing physically changed)
active ──commit───> committed  (on_hand AND reserved both decrease — a real, permanent stock decrease,
                                 logged as its own StockAdjustment with reason "reservation_committed")
```
Both transitions are one-way from `active`; attempting either on an already-`released`/`committed` reservation is a `409 InvalidReservationStateException`.

### 3.4 Stock transfer
```
initiate(from, to, sku, qty)
   │  → checks source availability, creates StockTransfer(status=pending),
   │    reserves qty at source (a StockReservation referencing this transfer)
   ▼
pending ──complete──> completed  (destination StockItem created if first time; both
   │                              StockItem rows locked in warehouse_id order to avoid
   │                              deadlock against a concurrent reverse transfer; source
   │                              on_hand & reserved both decrease, destination on_hand
   │                              increases; 2 StockAdjustment rows appended — one per side;
   │                              the transfer's reservation flips to committed)
   │
   └──cancel────> cancelled  (releases the source-side hold only; destination never touched)
```
Both `complete`/`cancel` are only valid while `pending` — otherwise `409 InvalidTransferStateException`.

### 3.5 What triggers what — event summary

| Action | Publishes | Who could subscribe (future, none exist yet) |
|---|---|---|
| Adjust, commit reservation, complete transfer | `StockAdjusted` | future Search (low-stock reindex), future Notifications (low-stock alert) |
| Reserve stock | `StockReserved` | future Checkout confirmation flows |
| Release reservation, cancel transfer | `StockReleased` | future Checkout abandonment handling |

No listener anywhere in the codebase currently subscribes to any of these three — Inventory publishes into a bus with no current audience, exactly like Fulfillment/Notifications/Returns did before their respective trigger modules existed. This is intentional, matches the established platform pattern, and is **not a gap to fix in this phase**.

---

## 4. Merchant UX design

### 4.1 Navigation
A new top-level "Inventory" nav group (mirrors Catalog's own group pattern), permission-gated per item exactly like Catalog:

```
Inventory
 ├─ Stock Levels        (StockItem list — the default landing page; "how much do I have")
 ├─ Adjustments          (cross-item StockAdjustment history — "what changed and why")
 ├─ Reservations         (cross-item StockReservation list — "what's on hold")
 ├─ Transfers            (StockTransfer list/detail — "what's moving between warehouses")
 └─ Warehouses           (Warehouse CRUD — setup screen, visited rarely once configured)
```
With exactly one warehouse, "Stock Levels" reads like a flat product-stock list; the warehouse column/filter is present but inert until a second warehouse exists — no separate "simple mode" vs. "multi-warehouse mode" to build or maintain later (per §2.6).

### 4.2 Stock Levels (`StockItemController@index`)
- `DataTable` columns: **Product** (client-side join: SKU → Catalog product/variant name + thumbnail, resolved by matching `StockItem.sku` against Catalog's product/variant SKU — falls back to showing the bare SKU if no Catalog match exists, e.g. a non-catalog SKU or a SKU typo), **SKU**, **Warehouse** (hidden column when only one warehouse exists), **On Hand**, **Reserved**, **Available** (visually distinct — available is the number merchants actually care about; on-hand/reserved shown as supporting detail, matching §2.1).
- `FilterBar`: warehouse (only rendered once >1 warehouse exists), SKU/product search.
- Row action: **Adjust stock** → opens the Adjust Stock dialog (§4.3) prefilled with this row's warehouse+SKU.
- Row click / expand: shows the item's own Reservations and recent Adjustments inline (both already have dedicated `GET` endpoints — `/stock-items/{id}/reservations`, `/stock-items/{id}/adjustments`) — avoids forcing a merchant to leave the row to understand "why is available lower than on-hand."
- No create/delete affordance here — matches the backend precisely: a `StockItem` is never created directly, only as an adjustment/transfer side effect. The empty state for "no stock recorded yet" routes to **Adjust stock**, not a fabricated "New stock item" action.

### 4.3 Adjust Stock (dialog, not a route — a 4-field form)
Fields: Warehouse (select, defaults to the item's warehouse if opened from a row, or the default warehouse if opened globally), SKU (text, with the same Catalog-product-typeahead enrichment as §4.2 for merchant confidence they're adjusting the right thing), Quantity change (signed number input — a segmented **+/−** toggle plus magnitude reads more clearly than asking for a raw signed integer), Reason (required text — a short set of common presets — *"Received shipment," "Stocktake correction," "Damaged/written off," "Other"* — feeding the same free-text `reason` field the backend already accepts, not a new backend enum). Submits to `POST /stock-items/adjust`. A `409 InsufficientStockException` (negative delta would take on-hand below zero) surfaces inline: *"Only N available — cannot remove Q."*

### 4.4 Adjustments (history, `StockItemController@adjustments`, called per-item or aggregated client-side across recently-viewed items — **no dedicated cross-warehouse "all adjustments" endpoint exists**, see §9 gap)
A read-only ledger view — date, SKU, warehouse, delta (+/− styled), reason, actor. This is the "why did stock change" audit surface merchants actually reach for, distinct from the Activity/Audit Log tab (§4.7), which is the *system-action* audit trail (who archived a warehouse, etc.) rather than the *stock-movement* ledger.

### 4.5 Reservations
List view of `StockReservation`s (sourced per-`StockItem` via the real endpoint, aggregated client-side same as §4.4) — quantity, reference (rendered as *"Manual hold"* when `referenceType` is null, or the raw type/id otherwise until Checkout exists to give it a friendly label), status, created date. Actions: **Release** (`POST /reservations/{id}/release`) on any `active` row; **Commit** is deliberately **not exposed as a manual merchant action in Phase 1** — committing a reservation represents "this held stock actually shipped," which today is Fulfillment's future call to make via a real order, not something a merchant should be able to trigger by hand and silently decrement on-hand stock outside any order context. The endpoint stays available for that future integration; the UI intentionally doesn't expose a footgun for it. A **"Place manual hold"** creation action (`POST /stock-items/{id}/reservations`) is included, scoped to the same `inventory.reservations.manage` permission, for the legitimate pre-Checkout merchant workflow of reserving stock for an offline/phone order.

### 4.6 Transfers
List (`StockTransferController@index`) + detail. Status badge (`pending`/`completed`/`cancelled`). **New transfer** form: from-warehouse, to-warehouse (excludes whichever is picked as "from"), SKU, quantity — disabled entirely (with an explanatory empty state) until a second warehouse exists, since `different:from_warehouse_id` makes a same-warehouse transfer impossible by design. Detail view actions: **Complete** / **Cancel**, both only enabled while `pending`.

### 4.7 Warehouses
Standard taxonomy-style CRUD screen, following the exact same `CrudPageLayout` + `DataTable` + `{Entity}FormDialog` pattern already established for Catalog's Brands/Categories/etc.: list (code, name, city, default badge, status), create/edit dialog, archive/restore, delete (blocked with the real 409 reason when stock is still recorded against it — reusing the same dependent-records `ConfirmDialog` pattern Catalog's Phase 2.2 freeze already built and proved out).

### 4.8 Audit Log tab
A dedicated **Inventory Activity** view (`AuditLogController@index`, `target_type` filter available) — same list-of-system-actions pattern as Catalog's own Activity tab, showing `warehouse.created`, `stock.adjusted`, `stock_transfer.completed`, etc. with before/after JSON. This is the system-action trail; kept visually distinct from §4.4's stock-movement ledger even though both ultimately come from actions a merchant took, because they answer different questions ("what did someone *do*" vs. "how did *this SKU's count* change").

---

## 5. API surface (complete — every Inventory route that exists, nothing invented)

| Method | Path | Permission | UI surface |
|---|---|---|---|
| GET | `/warehouses` | `inventory.warehouses.view` | Warehouses list |
| POST | `/warehouses` | `inventory.warehouses.manage` | Warehouses — create dialog |
| GET | `/warehouses/{id}` | `inventory.warehouses.view` | Warehouses — detail (if needed by a form prefill) |
| PATCH | `/warehouses/{id}` | `inventory.warehouses.manage` | Warehouses — edit dialog (`expected_version` required) |
| POST | `/warehouses/{id}/archive` | `inventory.warehouses.manage` | Warehouses — archive action (`expected_version` required) |
| DELETE | `/warehouses/{id}` | `inventory.warehouses.manage` | Warehouses — delete action (`expected_version` required, 409 if stock exists) |
| POST | `/warehouses/{id}/restore` | `inventory.warehouses.manage` | Warehouses — restore action |
| GET | `/stock-items` | `inventory.stock.view` | Stock Levels list (filters: `warehouse_id`, `sku`) |
| POST | `/stock-items/adjust` | `inventory.stock.manage` | Adjust Stock dialog |
| GET | `/stock-items/{id}` | `inventory.stock.view` | Stock Levels — row detail |
| GET | `/stock-items/{id}/adjustments` | `inventory.stock.view` | Adjustments ledger (per item) |
| POST | `/stock-items/{id}/reservations` | `inventory.reservations.manage` | Reservations — place manual hold |
| GET | `/stock-items/{id}/reservations` | `inventory.stock.view` | Reservations list (per item) |
| POST | `/reservations/{id}/release` | `inventory.reservations.manage` | Reservations — release action |
| POST | `/reservations/{id}/commit` | `inventory.reservations.manage` | *(endpoint exists; deliberately not exposed in Phase 1 UI — see §4.5)* |
| GET | `/stock-transfers` | `inventory.stock.view` | Transfers list |
| POST | `/stock-transfers` | `inventory.transfers.manage` | Transfers — new transfer form |
| GET | `/stock-transfers/{id}` | `inventory.stock.view` | Transfers — detail |
| POST | `/stock-transfers/{id}/complete` | `inventory.transfers.manage` | Transfers — complete action |
| POST | `/stock-transfers/{id}/cancel` | `inventory.transfers.manage` | Transfers — cancel action |
| GET | `/inventory/availability?sku=` | `inventory.stock.view` | Optional: single-SKU cross-warehouse availability lookup (useful inside the Adjust/Transfer dialogs as a "current availability everywhere" preview) |
| GET | `/inventory/audit-logs` | `inventory.audit_log.view` | Inventory Activity tab |

All error envelopes follow the existing pattern: `409 { error: { type: 'conflict', message } }` for `InsufficientStockException` / `InvalidReservationStateException` / `InvalidTransferStateException` / `DependentRecordsExistException` / `ConcurrencyConflictException` — `apps/admin/src/modules/catalog/shared/errors.ts`'s `catalogErrorMessage()`-style regex-on-message pattern will need an Inventory-specific equivalent (`inventoryErrorMessage()`), since the *reasons* differ even though the HTTP shape doesn't.

---

## 6. Permissions (all 7 keys — real, from `PermissionRegistry.php`, nothing added)

| Key | Grants | UI gate |
|---|---|---|
| `inventory.warehouses.view` | See warehouses | Warehouses list |
| `inventory.warehouses.manage` | Create/update/archive/delete/restore warehouses | Warehouses — all mutation buttons |
| `inventory.stock.view` | See stock levels, adjustment history, reservations, transfers | Stock Levels, Adjustments, Transfers lists, read-only Reservations |
| `inventory.stock.manage` | Adjust stock | Adjust Stock action |
| `inventory.reservations.manage` | Reserve/release/commit | Reservations — hold/release actions |
| `inventory.transfers.manage` | Initiate/complete/cancel transfers | Transfers — all mutation actions |
| `inventory.audit_log.view` | See Inventory's audit log | Activity tab |

No per-warehouse or per-SKU scoping exists at the permission layer (same flat model as Catalog) — `RequirePermission anyOf={[...]}` is again the only gating primitive needed, no new authorization concept to design.

---

## 7. Audit strategy

Two independent, intentionally-separate audit surfaces, both already fully backed:

1. **System-action audit** (`inventory_audit_logs` / `AuditLogger`) — who did what administrative action, when, with before/after snapshots. Same shape, same guarantees, same UI treatment as Catalog's Activity tab. Every mutating Action in the module already calls it — nothing to add.
2. **Stock-movement ledger** (`StockAdjustment`) — the fraud-grade, immutable, append-only record of every quantity change, with a mandatory reason. This is *stronger* than a generic audit log by design (no `updated_at`, no soft-delete) specifically because stock manipulation is a named fraud vector per the master plan's own Security Considerations for this module.

Design implication for the UI: never let these two surfaces visually merge into one "history" feed. A merchant asking "why is my count wrong" wants the ledger (§4.4); a merchant asking "who archived this warehouse" wants the Activity tab (§4.8). Conflating them (as a generic "Activity" tab alone would) would bury the fraud-relevant ledger inside noise.

---

## 8. Performance considerations

- **Row-locking, not optimistic locking, on the hot path.** `AdjustStockAction`/`ReserveStockAction`/`CompleteStockTransferAction` all use `lockForUpdate()` on the `StockItem` row(s) involved — correct for a single-row hot-write pattern, but means **concurrent adjustments to the same SKU serialize**, not parallelize. At 50,000+ orders/month this is fine for adjustment/receiving workflows (low frequency per SKU), but is the *exact* mechanism a future Checkout's reservation-at-add-to-cart flow will stress hardest on a viral/flash-sale SKU. Nothing to fix in this phase — noted because it constrains how "Place manual hold" (§4.5) should be framed to merchants: not a bulk/high-frequency tool.
- **`CompleteStockTransferAction`'s deadlock-avoidance ordering** (lock rows by `warehouse_id` ascending, not "source then destination") is already correct and documented in the migration/action docblocks — no UI concern, but worth the design record acknowledging it was deliberately engineered, not accidental.
- **No dedicated "all adjustments across all items" or "all reservations across all items" endpoint** — only per-`StockItem` (`/stock-items/{id}/adjustments`, `/stock-items/{id}/reservations`). At 100,000+ SKUs, an aggregated Adjustments/Reservations screen (§4.4, §4.5) built by looping per-item calls does not scale and must not be built that way. See §9 for the resulting sequencing implication.
- **`AvailabilityController`'s `whereHas('warehouse', ...)`** joins per SKU lookup — fine for the single-SKU dialog-preview use (§5) it's designed for; not a bulk-lookup endpoint and shouldn't be called in a loop from a list view.
- **Pagination**: every list endpoint (`warehouses`, `stock-items`, `stock-transfers`, `inventory/audit-logs`) uses Laravel's standard `paginate()` (default page size, `audit-logs` explicitly configurable via `per_page`) — same `meta.current_page/per_page/total/last_page` envelope as Catalog, so the exact `useResourceListAll()` pattern already built and proven during the Catalog freeze (for selector dropdowns needing "all," not paged, results) is directly reusable for Inventory's warehouse-selector dropdowns in the Adjust/Transfer forms.

---

## 9. Known gaps and honest limitations (things the UI must not paper over)

- **No dedicated cross-item Adjustments/Reservations list endpoint.** §4.4/§4.5's "aggregated" views are only buildable today by fetching per visited `StockItem`, which does not scale as a standalone global screen at real catalog size. **Recommendation:** ship §4.4/§4.5 scoped to "recently adjusted/reserved items" or accessed only from a specific `StockItem`'s row-expand (§4.2) in the first implementation slice, rather than promising a paginated global ledger the backend can't yet serve efficiently — revisit as a possible small, additive backend endpoint (`GET /stock-adjustments`, `GET /stock-reservations`) in a later slice if merchant feedback demands a global view. This is a real product gap, not a UI polish item — flagging it now rather than discovering it mid-build.
- **`StockReservation.expires_at` has no writer or sweeper.** The column exists (matching Checkout's future need for TTL'd holds) but nothing sets it yet, and there's no scheduled command analogous to `checkout:expire-sessions` to release stale ones. Manual holds placed via §4.5 today are held **indefinitely** until someone releases them by hand. The UI should say so plainly (e.g. *"Manual holds do not expire automatically — release them when no longer needed"*) rather than implying a TTL that doesn't functionally exist yet.
- **No low-stock threshold / reorder point field anywhere in the schema.** Cannot build a "low stock" indicator or alert without a schema change — explicitly out of scope for this phase, and should be named as a candidate for `MODULE:SUPPLIER_MANAGEMENT` (Phase 2, Purchase Orders) rather than bolted onto Inventory's existing entities.
- **No barcode/scanning field or workflow.** Not in scope; SKU is a plain string field, nothing more.
- **SKU-to-Catalog-product join is entirely client-side and best-effort.** A `StockItem` with a `sku` that doesn't match any live Catalog product/variant (typo, deleted product, non-catalog SKU) is valid and must render gracefully (bare SKU, no crash, no "unknown product" error state) — this will happen in real data and is not a bug when it does.

---

## 10. Explicitly out of scope for Phase 2.3 (do not build)

- Suppliers, Purchase Orders (`MODULE:SUPPLIER_MANAGEMENT`, Phase 2, a separate module per the master plan — not this one, even though "receiving stock" sounds adjacent).
- Any Checkout-triggered reservation flow — Checkout doesn't exist yet; `referenceType`/`referenceId` stay generic/manual until it does.
- Barcode scanning, cycle counts, reorder points/low-stock alerts (§9).
- A global cross-item Adjustments/Reservations list (§9) — scoped/per-item only in the first slices.
- Committing a reservation from the UI (§4.5) — the endpoint exists for future Fulfillment integration, not manual merchant use.
- Any new backend endpoint, permission, or schema field.

---

## 11. Readiness assessment

**The backend is production-ready for this scope.** Every workflow in §3 has correct transactional boundaries, correct concurrency handling for its own use case (pessimistic locking on the hot stock-mutation path, matching how frequently that data actually contends), a real audit trail satisfying the fraud-vector requirement called out in the module's own Security Considerations, and a schema that is already multi-warehouse-complete — Phase 2's "multi-warehouse" work is a UI-scoping exercise (remove the "only one warehouse" assumptions in §4.1/§4.2/§4.6), not a backend redesign, exactly as the migration docblocks promise.

**What's not ready is purely UI/product-surface, and is exactly what §4–§10 above define.** No blocking backend gap was found. The one real limitation worth the Product Owner's attention before or during build is §9's missing cross-item Adjustments/Reservations endpoint — a scoping decision, not a defect.

## 12. Architecture review

**Strengths:**
- Textbook adherence to this platform's own established patterns — per-module `AuditLogger`/`PermissionRegistry`/exception classes, `HasUuids`, tenant-scoping via `booted()` hooks, DomainEventBus publication with zero live subscribers yet (matching Fulfillment/Notifications/Returns' own pre-consumer history) — nothing here is a one-off; it's the same shape as every other Commerce module.
- Correct, deliberate concurrency model: optimistic locking (`expected_version`) where a human is editing a form (Warehouse), pessimistic row-locking where two systems/people can legitimately race on the same counter (StockItem mutations) — this distinction is exactly right and should not be "made consistent" by well-meaning refactor later.
- Cross-module coupling discipline (`sku` as a string, `reference_type`/`reference_id` as a generic pair) is the same loose-coupling pattern used everywhere else in this codebase for cross-domain references — genuinely future-proof for ERP integration (an external ERP's stock feed could write `StockAdjustment` rows or call `AdjustStockAction` through the same API surface without any schema change, since nothing about the contract assumes the actor is a neXgen admin user versus an integration).

**Risks / things to watch, not blockers:**
- The missing cross-item ledger endpoints (§9) will surface as a real merchant complaint ("why can't I just see everything that changed today") once usage grows — worth flagging to the Product Owner now as a probable near-term follow-up request, not a surprise later.
- `StockReservation.expires_at` being a dead column today is a small trap for a future engineer who assumes it's live — worth a one-line note in the model docblock when this module is next touched (not urgent enough to justify touching the backend in this phase).
- Manual reservations (§4.5) are the one place this design adds a genuinely new *product* capability (not new API) atop a backend contract built with Checkout as the intended caller — worth the Product Owner's explicit sign-off since it's a merchant workflow decision, not just a wiring exercise.

## 13. Implementation slices (for approval, no code written yet)

**Slice 1 — Warehouses + Stock Levels (read/adjust core).**
`packages/api-client/src/inventory/` (types + warehouses/stockItems wrappers), Warehouses CRUD screen (§4.7, mirrors Catalog taxonomy pattern exactly), Stock Levels list + row-expand (§4.2), Adjust Stock dialog (§4.3) with the Catalog-SKU client-side join. This alone gives a merchant a usable, correct "how much do I have, and let me correct it" tool — the highest-value, lowest-risk slice, and the one that proves out the SKU-join pattern everything else depends on.

**Slice 2 — Reservations.**
Reservations list scoped per-item (§4.5, per the §9 scoping decision), place-hold / release actions. Depends on Slice 1's Stock Levels row-expand as its entry point.

**Slice 3 — Transfers.**
Transfers list/detail/new-transfer flow (§4.6) — deliberately last among the "core" slices since it's inert with a single warehouse and only becomes real once a merchant adds a second one.

**Slice 4 — Activity / Audit.**
Inventory Activity tab (§4.8) plus the Adjustments ledger view (§4.4, scoped per §9). Lowest urgency — valuable but not blocking day-one usability, and benefits from Slices 1–2 already existing so there's real data to show.

Each slice independently passes the same quality gates this engagement has used throughout (`typecheck`/`lint`/`test`/`build`/`test:e2e`), and each is independently shippable — a merchant gets real value after Slice 1 alone.

---

**Awaiting Product Owner approval before any implementation begins**, per the explicit instruction this document was commissioned under. Specific decisions worth an explicit yes/no before coding starts:
1. Is the **manual reservation ("place a hold")** merchant workflow (§4.5) wanted for v1, or should Reservations ship read-only (view + release only) until Checkout exists to create them for real?
2. Is scoping Adjustments/Reservations to **per-item only** (§9), deferring a global ledger, acceptable for v1?
3. Confirm the **slice order** in §13, or reprioritize (e.g. Transfers before Reservations if multi-warehouse matters sooner than manual holds).
