import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type { StockReservationDTO, ReserveStockInput, ListStockItemReservationsQuery } from './types.js';

const STOCK_ITEMS_PATH = '/stock-items';
const RESERVATIONS_PATH = '/reservations';

/** `GET /stock-items/{id}/reservations` — `inventory.stock.view`. Per-item only; there is no cross-item reservation list endpoint (see the architecture doc's own §9 gap analysis), so this is the only way reservations are ever listed. */
export function listStockItemReservations(
  client: ApiClient,
  stockItemId: string,
  query?: ListStockItemReservationsQuery,
): Promise<ListEnvelope<StockReservationDTO>> {
  return client.get<ListEnvelope<StockReservationDTO>>(`${STOCK_ITEMS_PATH}/${stockItemId}/reservations`, {
    query: query && { page: query.page, per_page: query.perPage },
  });
}

/** `POST /stock-items/{id}/reservations` — `inventory.reservations.manage`. Places a hold, reducing `quantityAvailable` without touching `quantityOnHand`. A 409 (`InsufficientStockException`) means not enough is available to hold. */
export function reserveStock(client: ApiClient, stockItemId: string, input: ReserveStockInput): Promise<StockReservationDTO> {
  return client
    .post<DataEnvelope<StockReservationDTO>>(`${STOCK_ITEMS_PATH}/${stockItemId}/reservations`, {
      quantity: input.quantity,
      reference_type: input.referenceType,
      reference_id: input.referenceId,
    })
    .then((r) => r.data);
}

/** `POST /reservations/{id}/release` — `inventory.reservations.manage`. Frees the held quantity back to available; only valid while the reservation is `active` (409 `InvalidReservationStateException` otherwise). */
export function releaseReservation(client: ApiClient, reservationId: string): Promise<StockReservationDTO> {
  return client.post<DataEnvelope<StockReservationDTO>>(`${RESERVATIONS_PATH}/${reservationId}/release`).then((r) => r.data);
}
