import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type { ShipmentNoteDTO, AddShipmentNoteInput } from './types.js';

/**
 * `POST /shipments/{id}/notes` — `fulfillment.shipments.manage`.
 * `AddShipmentNoteAction` carries no status guard at all (confirmed by
 * reading it directly) — a note can be added at any point in a shipment's
 * life, including after it's terminal, unlike destination/items. Append-
 * only: no edit/delete endpoint exists (mirrors `OrderNote`'s own shape).
 */
export function addShipmentNote(client: ApiClient, shipmentId: string, input: AddShipmentNoteInput): Promise<ShipmentNoteDTO> {
  return client
    .post<DataEnvelope<ShipmentNoteDTO>>(`/shipments/${shipmentId}/notes`, {
      body: input.body,
      is_customer_visible: input.isCustomerVisible ?? false,
    })
    .then((r) => r.data);
}
