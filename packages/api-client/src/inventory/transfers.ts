import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type { StockTransferDTO, InitiateStockTransferInput, ListStockTransfersQuery } from './types.js';

/** `apps/backend/.../Inventory/routes.php` — `stock-transfers`, `inventory.stock.view` (list/show) / `inventory.transfers.manage` (initiate/complete/cancel). */
const BASE_PATH = '/stock-transfers';

/** `GET /stock-transfers` — `inventory.stock.view`. `StockTransferController::index` supports a `status` filter and Laravel's own `page` param only (no `per_page`, no `sku`/warehouse search) — confirmed by reading the controller directly. */
export function listStockTransfers(client: ApiClient, query?: ListStockTransfersQuery): Promise<ListEnvelope<StockTransferDTO>> {
  return client.get<ListEnvelope<StockTransferDTO>>(BASE_PATH, { query: query && { status: query.status, page: query.page } });
}

/** `GET /stock-transfers/{id}` — `inventory.stock.view`. */
export function getStockTransfer(client: ApiClient, id: string): Promise<StockTransferDTO> {
  return client.get<DataEnvelope<StockTransferDTO>>(`${BASE_PATH}/${id}`).then((r) => r.data);
}

/** `POST /stock-transfers` — `inventory.transfers.manage`. Places a hold against the source warehouse's stock immediately (`status: pending`); a 409 (`InsufficientStockException`) means not enough is available there to hold. */
export function initiateStockTransfer(client: ApiClient, input: InitiateStockTransferInput): Promise<StockTransferDTO> {
  return client
    .post<DataEnvelope<StockTransferDTO>>(BASE_PATH, {
      from_warehouse_id: input.fromWarehouseId,
      to_warehouse_id: input.toWarehouseId,
      sku: input.sku,
      quantity: input.quantity,
    })
    .then((r) => r.data);
}

/** `POST /stock-transfers/{id}/complete` — `inventory.transfers.manage`. Moves the held quantity from the source's on-hand into the destination's; only valid while the transfer is `pending` (409 `InvalidTransferStateException` otherwise). */
export function completeStockTransfer(client: ApiClient, id: string): Promise<StockTransferDTO> {
  return client.post<DataEnvelope<StockTransferDTO>>(`${BASE_PATH}/${id}/complete`).then((r) => r.data);
}

/** `POST /stock-transfers/{id}/cancel` — `inventory.transfers.manage`. Releases the source-side hold without ever touching the destination; only valid while the transfer is `pending` (409 `InvalidTransferStateException` otherwise). */
export function cancelStockTransfer(client: ApiClient, id: string): Promise<StockTransferDTO> {
  return client.post<DataEnvelope<StockTransferDTO>>(`${BASE_PATH}/${id}/cancel`).then((r) => r.data);
}
