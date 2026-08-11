import type { InventoryAuditLogDTO } from '@nexgen/api-client';

/**
 * `AuditLog.action` (apps/backend) is a stable machine string like
 * `stock.adjusted` or `warehouse.archived` — turns it into operator-facing
 * text without a hand-maintained lookup table, so a future action logged by
 * this module still renders sensibly without a frontend change. Identical
 * in spirit to Catalog's own `humanizeAuditAction`
 * (`modules/catalog/products/editor/activity/activityFormat.ts`), kept as
 * its own small copy per this module's "own its own copy" convention.
 */
export function humanizeAuditAction(action: string): string {
  const words = action.replace(/\./g, ' ').replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * `stock.adjusted`/`stock.reservation_committed` entries carry
 * `quantity_delta`/`reason`/`quantity_on_hand` in `after` (see
 * `AdjustStockAction`, apps/backend) — split out from the summary string
 * (below) so the timeline can render the delta as its own `DeltaBadge`
 * rather than duplicating the number inside a sentence.
 */
export interface StockAdjustedDetails {
  delta: number;
  reason?: string;
  quantityOnHand?: number;
}

export function stockAdjustedDetails(entry: InventoryAuditLogDTO): StockAdjustedDetails | null {
  if (entry.action !== 'stock.adjusted' && entry.action !== 'stock.reservation_committed') return null;
  const after = entry.after as { quantity_delta?: number; reason?: string; quantity_on_hand?: number } | null;
  if (!after || typeof after.quantity_delta !== 'number') return null;
  return { delta: after.quantity_delta, reason: after.reason, quantityOnHand: after.quantity_on_hand };
}

/**
 * The "what changed / why" line for a `stock.adjusted` entry, minus the
 * delta itself (rendered separately as a `DeltaBadge`) — e.g. "Received
 * shipment · now 15 on hand".
 */
export function stockAdjustedSummary(details: StockAdjustedDetails): string | null {
  const parts: string[] = [];
  if (details.reason) parts.push(details.reason);
  if (typeof details.quantityOnHand === 'number') parts.push(`now ${details.quantityOnHand} on hand`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** `warehouse.*` entries carry a `code`/`name` snapshot in `after` (or `before`, for `warehouse.deleted`, which has no `after`). */
export interface WarehouseSnapshot {
  name: string;
  code?: string;
}

export function warehouseSnapshot(entry: InventoryAuditLogDTO): WarehouseSnapshot | null {
  if (!entry.action.startsWith('warehouse.')) return null;
  const snapshot = (entry.after ?? entry.before) as { name?: string; code?: string } | null;
  if (!snapshot?.name) return null;
  return { name: snapshot.name, code: snapshot.code };
}

/**
 * Backward-compatible combined summary (still used by tests exercising the
 * plain-text form) — defers to the two functions above.
 */
export function summarizeInventoryAuditEntry(entry: InventoryAuditLogDTO): string | null {
  const stock = stockAdjustedDetails(entry);
  if (stock) return stockAdjustedSummary(stock);

  const warehouse = warehouseSnapshot(entry);
  if (warehouse) return warehouse.code ? `${warehouse.name} (${warehouse.code})` : warehouse.name;

  return null;
}
