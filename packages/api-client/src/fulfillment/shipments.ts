import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { ShipmentDTO, ListShipmentsQuery } from './types.js';

/** `apps/backend/.../Fulfillment/routes.php` — `shipments`, `fulfillment.shipments.view`. List only — see `types.ts`'s own docblock for why nothing else from Fulfillment is wrapped here. */
const BASE_PATH = '/shipments';

export function listShipments(client: ApiClient, query?: ListShipmentsQuery): Promise<ListEnvelope<ShipmentDTO>> {
  return client.get<ListEnvelope<ShipmentDTO>>(BASE_PATH, {
    query: query && { status: query.status, order_id: query.orderId, page: query.page },
  });
}
