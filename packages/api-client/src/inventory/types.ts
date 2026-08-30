/**
 * Inventory DTOs — the exact camelCase shape of `apps/backend`'s real
 * Inventory API Resources (`Http/Resources/*Resource.php`) and the exact
 * fields the real `Create*Request`/`Update*Request`/`AdjustStockRequest`/
 * `ReserveStockRequest`/`InitiateStockTransferRequest` classes accept.
 * Slice 1 covered Warehouses, Stock Items/Levels, Manual Adjustment, and
 * Activity; Slice 2 added Stock Reservations (`StockReservation`,
 * `ReserveStockAction`/`ReleaseReservationAction`); Slice 3 adds Stock
 * Transfers (`StockTransfer`, `InitiateStockTransferAction`/
 * `CompleteStockTransferAction`/`CancelStockTransferAction`).
 */

// ---------------------------------------------------------------------------
// Warehouse
// ---------------------------------------------------------------------------

export type WarehouseStatus = 'active' | 'archived';

export interface WarehouseAddressDTO {
  line1: string | null;
  line2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string | null;
}

export interface WarehouseDTO {
  id: string;
  code: string;
  name: string;
  address: WarehouseAddressDTO;
  isDefault: boolean;
  status: WarehouseStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateWarehouseInput {
  code: string;
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  countryCode?: string;
  isDefault?: boolean;
}

export interface UpdateWarehouseInput extends Partial<CreateWarehouseInput> {
  expectedVersion: number;
}

/** `WarehouseController::index` (apps/backend) reads `status` and Laravel's own `page` param only — it never calls `$request->integer('per_page')` the way `AuditLogController` does, so no `perPage` field here (would silently do nothing). */
export interface ListWarehousesQuery {
  status?: WarehouseStatus;
  page?: number;
}

// ---------------------------------------------------------------------------
// Stock Item — `StockItem`, apps/backend. Keyed by `sku` (string) +
// `warehouseId`, never a Catalog foreign key — see
// `App\Domains\Commerce\Inventory\Models\StockItem` and the
// `create_stock_items_table` migration's own docblock.
// ---------------------------------------------------------------------------

export interface StockItemDTO {
  id: string;
  warehouseId: string;
  sku: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ListStockItemsQuery {
  warehouseId?: string;
  /** `StockItemController::index` (apps/backend) filters by exact match — no partial/`LIKE` search on this column. */
  sku?: string;
  /**
   * Production Completion Plan v2, Milestone 8 (Dashboard Real Widgets) —
   * filters on the real computed `quantity_on_hand - quantity_reserved`
   * expression (no stored "available" column exists — see
   * `StockItemController::index`'s own docblock) and, when present, also
   * switches the real ordering to ascending-by-that-same-expression so the
   * lowest-stock items sort first. The real "Low Stock" dashboard widget's
   * own backend support.
   */
  quantityLte?: number;
  page?: number;
  perPage?: number;
}

/** `AdjustStockRequest`, apps/backend — `quantity_delta` must be non-zero (`not_in:0`); a negative delta that would take on-hand below zero is rejected server-side (409 `InsufficientStockException`), never pre-validated client-side. */
export interface AdjustStockInput {
  warehouseId: string;
  sku: string;
  quantityDelta: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Stock Adjustment — `StockAdjustment`, apps/backend. Immutable, append-only
// ledger row; no update/destroy endpoint exists for this resource at all.
// ---------------------------------------------------------------------------

export interface StockAdjustmentDTO {
  id: string;
  stockItemId: string;
  quantityDelta: number;
  reason: string;
  actorId: string | null;
  createdAt: string;
}

export interface ListStockAdjustmentsQuery {
  page?: number;
  perPage?: number;
}

// ---------------------------------------------------------------------------
// Stock Reservation — `StockReservation`, apps/backend. A temporary hold
// against a StockItem's `quantityAvailable`, never its `quantityOnHand`.
// No `actorId` field on the resource itself (confirmed by reading
// `StockReservationResource` directly) — "who placed/released this hold"
// is only ever recorded in the Inventory Audit Log (`stock.reserved`/
// `stock.released` entries), not on the reservation record. `commit`
// (`POST /reservations/{id}/commit`) is a real endpoint but deliberately
// has no wrapper here — Slice 2 doesn't expose it in the UI (see the
// architecture doc §4.5: committing represents "this held stock actually
// shipped," a future Fulfillment-module call, not a manual merchant action).
// ---------------------------------------------------------------------------

export type StockReservationStatus = 'active' | 'released' | 'committed';

export interface StockReservationDTO {
  id: string;
  stockItemId: string;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  status: StockReservationStatus;
  expiresAt: string | null;
  createdAt: string | null;
}

/** `ReserveStockRequest`, apps/backend — `quantity` required min 1; `reference_type`/`reference_id` both nullable free-text. */
export interface ReserveStockInput {
  quantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
}

export interface ListStockItemReservationsQuery {
  page?: number;
  perPage?: number;
}

// ---------------------------------------------------------------------------
// Inventory Audit Log — `AuditLog`, apps/backend
// (`app/Domains/Commerce/Inventory/Audit/AuditLog.php`). `AuditLogController`
// filters by `target_type` only (no `actor_id`, no `target_id`) — the exact
// inverse gap from Catalog's own audit log endpoint (which filters by
// `actor_id`/`target_type` but not `target_id`). This is a real, global,
// paginated feed — unlike Catalog's per-product Activity card, Inventory's
// Movement History screen does not need a client-side `targetId` filter
// pass, since it's deliberately a cross-item feed, not scoped to one record.
// ---------------------------------------------------------------------------

export const INVENTORY_STOCK_ITEM_TARGET_TYPE = 'App\\Domains\\Commerce\\Inventory\\Models\\StockItem';
export const INVENTORY_WAREHOUSE_TARGET_TYPE = 'App\\Domains\\Commerce\\Inventory\\Models\\Warehouse';
export const INVENTORY_STOCK_TRANSFER_TARGET_TYPE = 'App\\Domains\\Commerce\\Inventory\\Models\\StockTransfer';

export interface InventoryAuditLogDTO {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  correlationId: string | null;
  createdAt: string;
}

export interface ListInventoryAuditLogsQuery {
  targetType?: string;
  page?: number;
  perPage?: number;
}

// ---------------------------------------------------------------------------
// Stock Transfer — `StockTransfer`, apps/backend. Movement of one SKU
// between two Warehouses. `InitiateStockTransferAction` places a hold (a
// StockReservation referencing this transfer) against the source
// warehouse's stock the moment a transfer is created (`status: pending`) —
// so the held units can't be sold out from under an in-progress transfer —
// but does not touch the destination warehouse until
// `CompleteStockTransferAction` runs, moving the held quantity from the
// source's on-hand into the destination's (creating the destination
// StockItem if this is its first stock there) and marking the reservation
// `committed`. `CancelStockTransferAction` simply releases that same hold
// without ever having touched the destination. Both `complete`/`cancel`
// only operate on a `pending` transfer — `InvalidTransferStateException`
// (409, already handled by `inventoryErrorMessage()`'s generic "is already
// [...] and cannot be changed" pattern) otherwise. No `actorId` field on
// the resource itself, same as `StockReservationDTO` — "who initiated /
// completed / cancelled this" is only ever recorded in the Inventory Audit
// Log (`stock_transfer.initiated`/`.completed`/`.cancelled` entries).
// ---------------------------------------------------------------------------

export type StockTransferStatus = 'pending' | 'completed' | 'cancelled';

export interface StockTransferDTO {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  sku: string;
  quantity: number;
  status: StockTransferStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `InitiateStockTransferRequest`, apps/backend — all four fields required; `to_warehouse_id` must differ from `from_warehouse_id` (`different:from_warehouse_id`), enforced server-side and mirrored client-side for immediate feedback, never relied on alone. */
export interface InitiateStockTransferInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  sku: string;
  quantity: number;
}

/** `StockTransferController::index` (apps/backend) reads `status` and Laravel's own `page` param via `paginate()` only — no `per_page` support (never reads it), same shape as `ListWarehousesQuery`. */
export interface ListStockTransfersQuery {
  status?: StockTransferStatus;
  page?: number;
}
