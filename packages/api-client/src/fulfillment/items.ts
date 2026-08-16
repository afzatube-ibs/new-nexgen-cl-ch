import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type { ShipmentItemDTO, AddShipmentItemInput } from './types.js';

/**
 * `POST /shipments/{id}/items` / `DELETE /shipments/{id}/items/{item}` —
 * `fulfillment.shipments.manage`. `AddShipmentItemAction`/
 * `RemoveShipmentItemAction` both refuse once the shipment is
 * packed/dispatched/in_transit/delivered/failed/cancelled
 * (`already_packed`, confirmed by reading both directly) — notably
 * `packing` (in progress, not yet settled) is NOT in that blocked list, so
 * items remain editable through the whole picking *and* packing stage,
 * only freezing once `MarkPackedAction` actually settles the shipment to
 * `packed`. This wrapper does not pre-check status; the caller decides.
 */
const BASE_PATH = '/shipments';

export function addShipmentItem(client: ApiClient, shipmentId: string, input: AddShipmentItemInput): Promise<ShipmentItemDTO> {
  return client
    .post<DataEnvelope<ShipmentItemDTO>>(`${BASE_PATH}/${shipmentId}/items`, {
      sku: input.sku,
      description: input.description || undefined,
      quantity: input.quantity,
    })
    .then((r) => r.data);
}

export function removeShipmentItem(client: ApiClient, shipmentId: string, itemId: string): Promise<void> {
  return client.delete<void>(`${BASE_PATH}/${shipmentId}/items/${itemId}`);
}
