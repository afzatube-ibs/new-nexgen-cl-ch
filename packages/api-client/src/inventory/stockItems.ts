import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type {
  StockItemDTO,
  ListStockItemsQuery,
  AdjustStockInput,
  StockAdjustmentDTO,
  ListStockAdjustmentsQuery,
} from './types.js';

const BASE_PATH = '/stock-items';

/** `StockItemController::index` — `inventory.stock.view`. No create/update/destroy endpoint exists; a StockItem row only ever comes into existence as a side effect of `adjustStock` or a completed transfer. */
export function listStockItems(client: ApiClient, query?: ListStockItemsQuery): Promise<ListEnvelope<StockItemDTO>> {
  return client.get<ListEnvelope<StockItemDTO>>(BASE_PATH, {
    query: query && { warehouse_id: query.warehouseId, sku: query.sku, page: query.page, per_page: query.perPage },
  });
}

export function getStockItem(client: ApiClient, id: string): Promise<StockItemDTO> {
  return client.get<DataEnvelope<StockItemDTO>>(`${BASE_PATH}/${id}`).then((r) => r.data);
}

/**
 * `POST /stock-items/adjust` — `inventory.stock.manage`. The single path by
 * which `quantity_on_hand` ever changes for a manual/external reason
 * (`AdjustStockAction`, apps/backend). Creates the StockItem row on first
 * use for a given warehouse+SKU pair. A negative `quantityDelta` that would
 * take on-hand below zero is rejected with a 409 (`InsufficientStockException`)
 * — never pre-validated client-side, since only the server holds the
 * authoritative, row-locked current quantity.
 */
export function adjustStock(client: ApiClient, input: AdjustStockInput): Promise<StockItemDTO> {
  return client
    .post<DataEnvelope<StockItemDTO>>(`${BASE_PATH}/adjust`, {
      warehouse_id: input.warehouseId,
      sku: input.sku,
      quantity_delta: input.quantityDelta,
      reason: input.reason,
    })
    .then((r) => r.data);
}

/** `GET /stock-items/{id}/adjustments` — this StockItem's own append-only ledger, newest first. Per-item only; no cross-item endpoint exists (see the Movement History screen's own use of the global Inventory Audit Log instead for a cross-item view). */
export function listStockItemAdjustments(
  client: ApiClient,
  stockItemId: string,
  query?: ListStockAdjustmentsQuery,
): Promise<ListEnvelope<StockAdjustmentDTO>> {
  return client.get<ListEnvelope<StockAdjustmentDTO>>(`${BASE_PATH}/${stockItemId}/adjustments`, {
    query: query && { page: query.page, per_page: query.perPage },
  });
}
