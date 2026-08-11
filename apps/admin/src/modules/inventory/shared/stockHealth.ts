import type { StockItemDTO, WarehouseStatus } from '@nexgen/api-client';

/**
 * Client-side display categorization only — never a backend concept.
 * `StockItem` (apps/backend) has no reorder-point / low-stock-threshold
 * column at all (confirmed by reading the real migration/model directly —
 * also named as a known gap in `planning/architecture/
 * PHASE_2_3_INVENTORY_ARCHITECTURE.md` §9: "no low stock threshold field
 * anywhere in the schema"). This is a fixed, documented heuristic applied
 * to the real `quantityAvailable` the backend already returns — it recolors
 * existing data, it does not compute anything the backend doesn't already
 * know. A real, merchant-configurable reorder point is future backend work,
 * not something to fake convincingly here.
 */
export const LOW_STOCK_THRESHOLD = 10;

export type StockHealthStatus = 'archived' | 'out_of_stock' | 'low_stock' | 'healthy';

export interface StockHealthInfo {
  status: StockHealthStatus;
  label: string;
  /** Matches `@nexgen/ui`'s own `Badge` variant names — no new colors introduced. */
  badgeVariant: 'success' | 'warning' | 'danger' | 'default';
}

const HEALTH_INFO: Record<StockHealthStatus, StockHealthInfo> = {
  archived: { status: 'archived', label: 'Archived', badgeVariant: 'default' },
  out_of_stock: { status: 'out_of_stock', label: 'Out of stock', badgeVariant: 'danger' },
  low_stock: { status: 'low_stock', label: 'Low stock', badgeVariant: 'warning' },
  healthy: { status: 'healthy', label: 'Healthy', badgeVariant: 'success' },
};

/**
 * `warehouseStatus` takes priority — stock recorded in an archived warehouse
 * isn't sellable regardless of its own quantity, and showing "Out of stock"
 * for it would suggest a merchant needs to act (reorder), when the real
 * action (if any) is about the warehouse, not the SKU.
 */
export function stockHealth(item: Pick<StockItemDTO, 'quantityAvailable'>, warehouseStatus?: WarehouseStatus): StockHealthInfo {
  if (warehouseStatus === 'archived') return HEALTH_INFO.archived;
  if (item.quantityAvailable <= 0) return HEALTH_INFO.out_of_stock;
  if (item.quantityAvailable <= LOW_STOCK_THRESHOLD) return HEALTH_INFO.low_stock;
  return HEALTH_INFO.healthy;
}
