import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type { ReturnRequestDTO, ListReturnRequestsQuery, CreateReturnRequestInput } from './types.js';

/** `apps/backend/.../Returns/routes.php` — `return-requests`, `returns.requests.view`/`.manage`. */
const BASE_PATH = '/return-requests';

export function listReturnRequests(client: ApiClient, query?: ListReturnRequestsQuery): Promise<ListEnvelope<ReturnRequestDTO>> {
  return client.get<ListEnvelope<ReturnRequestDTO>>(BASE_PATH, {
    query: query && { status: query.status, order_id: query.orderId, customer_id: query.customerId, page: query.page },
  });
}

/** `ReturnRequestController::show` — eager-loads `items`/`timelineEvents`/`notes`/`refundRequest`/`exchangeRequest` (confirmed by reading it directly — no `whenLoaded()` gap here). */
export function getReturnRequest(client: ApiClient, id: string): Promise<ReturnRequestDTO> {
  return client.get<DataEnvelope<ReturnRequestDTO>>(`${BASE_PATH}/${id}`).then((r) => r.data);
}

/** `ReturnRequestController::store` — `returns.requests.manage`. `items` passed as its own array, separate from the other attributes (confirmed by reading `CreateReturnRequestRequest`/the controller directly). */
export function createReturnRequest(client: ApiClient, input: CreateReturnRequestInput): Promise<ReturnRequestDTO> {
  return client
    .post<DataEnvelope<ReturnRequestDTO>>(BASE_PATH, {
      order_id: input.orderId,
      customer_id: input.customerId,
      type: input.type || undefined,
      reason: input.reason,
      reason_details: input.reasonDetails || undefined,
      items: input.items,
    })
    .then((r) => r.data);
}
