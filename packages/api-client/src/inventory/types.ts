/**
 * Inventory DTOs — the exact camelCase shape of `apps/backend`'s real
 * Inventory API Resources (`Http/Resources/*Resource.php`) and the exact
 * fields the real `Create*Request`/`Update*Request`/`AdjustStockRequest`
 * classes accept. Scoped to Phase 2.3 Slice 1 only (Warehouses, Stock
 * Items/Levels, Manual Adjustment, Activity) — Reservations and Transfers
 * have real backend endpoints too (see
 * `planning/architecture/PHASE_2_3_INVENTORY_ARCHITECTURE.md` §5) but no
 * DTOs here yet, since no Slice 1 screen consumes them.
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
