import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { OrderDTO, ListOrdersQuery } from './types.js';

/** `apps/backend/.../Orders/routes.php` — `orders`, `orders.orders.view`. List only — see `types.ts`'s own docblock for why nothing else from Orders is wrapped here. */
const BASE_PATH = '/orders';

export function listOrders(client: ApiClient, query?: ListOrdersQuery): Promise<ListEnvelope<OrderDTO>> {
  return client.get<ListEnvelope<OrderDTO>>(BASE_PATH, {
    query: query && { status: query.status, customer_id: query.customerId, q: query.q, page: query.page },
  });
}
