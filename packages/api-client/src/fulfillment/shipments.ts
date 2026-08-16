import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type { ShipmentDTO, ListShipmentsQuery } from './types.js';

/** `apps/backend/.../Fulfillment/routes.php` — `shipments`, `fulfillment.shipments.view`. Read-only (`list`/`get`) — no workflow-action capability is wrapped here, see `types.ts`'s own docblock. */
const BASE_PATH = '/shipments';

export function listShipments(client: ApiClient, query?: ListShipmentsQuery): Promise<ListEnvelope<ShipmentDTO>> {
  return client.get<ListEnvelope<ShipmentDTO>>(BASE_PATH, {
    query: query && { status: query.status, order_id: query.orderId, page: query.page },
  });
}

/** `ShipmentController::show` — the only endpoint that loads `items`/`timelineEvents`/`notes` (`$shipment->load([...])`, confirmed by reading it directly). */
export function getShipment(client: ApiClient, id: string): Promise<ShipmentDTO> {
  return client.get<DataEnvelope<ShipmentDTO>>(`${BASE_PATH}/${id}`).then((r) => r.data);
}
