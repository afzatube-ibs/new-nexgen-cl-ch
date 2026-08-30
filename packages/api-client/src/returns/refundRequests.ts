import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type { RefundRequestDTO, ListRefundRequestsQuery } from './types.js';

/** `apps/backend/.../Returns/routes.php` — `refund-requests`, `returns.requests.view`/`.resolve`. A refund is always created as a side effect of `resolve()`; there is no standalone create endpoint. */
const BASE_PATH = '/refund-requests';

export function listRefundRequests(client: ApiClient, query?: ListRefundRequestsQuery): Promise<ListEnvelope<RefundRequestDTO>> {
  return client.get<ListEnvelope<RefundRequestDTO>>(BASE_PATH, { query: query && { status: query.status, page: query.page } });
}

export function getRefundRequest(client: ApiClient, id: string): Promise<RefundRequestDTO> {
  return client.get<DataEnvelope<RefundRequestDTO>>(`${BASE_PATH}/${id}`).then((r) => r.data);
}

/** `POST /refund-requests/{id}/retry` — `returns.requests.resolve`. No body needed, just re-attempts the gateway call. */
export function retryRefundRequest(client: ApiClient, id: string): Promise<RefundRequestDTO> {
  return client.post<DataEnvelope<RefundRequestDTO>>(`${BASE_PATH}/${id}/retry`, {}).then((r) => r.data);
}
