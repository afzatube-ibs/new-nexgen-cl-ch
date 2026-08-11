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
 * `stock.adjusted` entries carry `quantity_delta`/`reason`/
 * `quantity_on_hand` in `after` (see `AdjustStockAction`, apps/backend).
 * `stock.reservation_committed` entries carry only `reservation_id`/
 * `quantity` (see `CommitReservationAction`) — no `reason`, no
 * `quantity_on_hand`, and the delta is always negative-by-the-held-quantity
 * (committing a hold permanently decreases on-hand by exactly what was
 * held), read directly from the source rather than assumed. Split out from
 * the summary string (below) so the timeline can render the delta as its
 * own `DeltaBadge` rather than duplicating the number inside a sentence.
 */
export interface StockAdjustedDetails {
  delta: number;
  reason?: string;
  quantityOnHand?: number;
}

export function stockAdjustedDetails(entry: InventoryAuditLogDTO): StockAdjustedDetails | null {
  if (entry.action === 'stock.adjusted') {
    const after = entry.after as { quantity_delta?: number; reason?: string; quantity_on_hand?: number } | null;
    if (!after || typeof after.quantity_delta !== 'number') return null;
    return { delta: after.quantity_delta, reason: after.reason, quantityOnHand: after.quantity_on_hand };
  }
  if (entry.action === 'stock.reservation_committed') {
    const after = entry.after as { quantity?: number } | null;
    if (!after || typeof after.quantity !== 'number') return null;
    return { delta: -after.quantity, reason: 'Reservation committed' };
  }
  return null;
}

/**
 * `stock.reserved`/`stock.released` entries (`ReserveStockAction`/
 * `ReleaseReservationAction`) carry `reservation_id`/`quantity` in `after` —
 * no `reason` (a reservation's own "why" lives on the `StockReservation`
 * record itself, not the audit log; see `reservationLabel.ts`) and no
 * on-hand change (a reservation moves `quantityReserved`, never
 * `quantityOnHand`). The action itself is kept alongside the quantity so the
 * summary can say "reserved" vs. "released" rather than a single generic verb.
 */
export interface ReservationEventDetails {
  reservationId?: string;
  quantity?: number;
  action: 'stock.reserved' | 'stock.released';
}

export function reservationEventDetails(entry: InventoryAuditLogDTO): ReservationEventDetails | null {
  if (entry.action !== 'stock.reserved' && entry.action !== 'stock.released') return null;
  const after = entry.after as { reservation_id?: string; quantity?: number } | null;
  if (!after) return null;
  return { reservationId: after.reservation_id, quantity: after.quantity, action: entry.action };
}

export function reservationEventSummary(details: ReservationEventDetails): string | null {
  if (typeof details.quantity !== 'number') return null;
  const verb = details.action === 'stock.released' ? 'released' : 'reserved';
  return `${details.quantity} unit${details.quantity === 1 ? '' : 's'} ${verb}`;
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

  const reservation = reservationEventDetails(entry);
  if (reservation) return reservationEventSummary(reservation);

  const warehouse = warehouseSnapshot(entry);
  if (warehouse) return warehouse.code ? `${warehouse.name} (${warehouse.code})` : warehouse.name;

  return null;
}
