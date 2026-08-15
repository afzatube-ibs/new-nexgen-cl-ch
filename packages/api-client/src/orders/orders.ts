import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type {
  OrderDTO,
  ListOrdersQuery,
  TransitionOrderInput,
  CancelOrderInput,
  AddOrderNoteInput,
  OrderNoteDTO,
} from './types.js';

/** `apps/backend/.../Orders/routes.php` — `orders`, `orders.orders.view`/`.manage`, `orders.notes.manage`. */
const BASE_PATH = '/orders';

export function listOrders(client: ApiClient, query?: ListOrdersQuery): Promise<ListEnvelope<OrderDTO>> {
  return client.get<ListEnvelope<OrderDTO>>(BASE_PATH, {
    query: query && { status: query.status, customer_id: query.customerId, q: query.q, page: query.page },
  });
}

/** `OrderController::show` — the only call that returns items/addresses/discounts/notes/timelineEvents. */
export function getOrder(client: ApiClient, id: string): Promise<OrderDTO> {
  return client.get<DataEnvelope<OrderDTO>>(`${BASE_PATH}/${id}`).then((r) => r.data);
}

/**
 * The five real status-transition endpoints (`OrderStatusController`) —
 * one function per named business action, mirroring the backend's own
 * design (a generic `updateStatus(order, status)` would invent a contract
 * that doesn't exist). Every call is `expected_version`-gated
 * (`ExpectedVersionRequest`, except `cancel`'s own `CancelOrderRequest`
 * which additionally requires `reason`).
 */
export function confirmOrder(client: ApiClient, id: string, input: TransitionOrderInput): Promise<OrderDTO> {
  return client.post<DataEnvelope<OrderDTO>>(`${BASE_PATH}/${id}/confirm`, { expected_version: input.expectedVersion }).then((r) => r.data);
}

export function startProcessingOrder(client: ApiClient, id: string, input: TransitionOrderInput): Promise<OrderDTO> {
  return client.post<DataEnvelope<OrderDTO>>(`${BASE_PATH}/${id}/start-processing`, { expected_version: input.expectedVersion }).then((r) => r.data);
}

export function shipOrder(client: ApiClient, id: string, input: TransitionOrderInput): Promise<OrderDTO> {
  return client.post<DataEnvelope<OrderDTO>>(`${BASE_PATH}/${id}/ship`, { expected_version: input.expectedVersion }).then((r) => r.data);
}

export function deliverOrder(client: ApiClient, id: string, input: TransitionOrderInput): Promise<OrderDTO> {
  return client.post<DataEnvelope<OrderDTO>>(`${BASE_PATH}/${id}/deliver`, { expected_version: input.expectedVersion }).then((r) => r.data);
}

export function cancelOrder(client: ApiClient, id: string, input: CancelOrderInput): Promise<OrderDTO> {
  return client
    .post<DataEnvelope<OrderDTO>>(`${BASE_PATH}/${id}/cancel`, { reason: input.reason, expected_version: input.expectedVersion })
    .then((r) => r.data);
}

/**
 * `OrderNoteController::store` — append-only (`orders.notes.manage`, a
 * permission separate from `.view`/`.manage`). No edit/delete function
 * exists here because no such endpoint exists on the backend.
 */
export function addOrderNote(client: ApiClient, orderId: string, input: AddOrderNoteInput): Promise<OrderNoteDTO> {
  return client
    .post<DataEnvelope<OrderNoteDTO>>(`${BASE_PATH}/${orderId}/notes`, {
      body: input.body,
      is_customer_visible: input.isCustomerVisible,
      expected_version: input.expectedVersion,
    })
    .then((r) => r.data);
}
