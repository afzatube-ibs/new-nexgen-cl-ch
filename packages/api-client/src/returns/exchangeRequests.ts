import type { ApiClient } from '../client.js';
import type { DataEnvelope, ListEnvelope } from '../types.js';
import type { ExchangeRequestDTO, ListExchangeRequestsQuery, ReturnExpectedVersionInput, MarkExchangeShippedInput } from './types.js';

/** `apps/backend/.../Returns/routes.php` — `exchange-requests`, `returns.requests.view`/`.manage`/`.cancel`. An exchange is always created as a side effect of `resolve()`; there is no standalone create endpoint. */
const BASE_PATH = '/exchange-requests';

export function listExchangeRequests(client: ApiClient, query?: ListExchangeRequestsQuery): Promise<ListEnvelope<ExchangeRequestDTO>> {
  return client.get<ListEnvelope<ExchangeRequestDTO>>(BASE_PATH, { query: query && { status: query.status, page: query.page } });
}

export function getExchangeRequest(client: ApiClient, id: string): Promise<ExchangeRequestDTO> {
  return client.get<DataEnvelope<ExchangeRequestDTO>>(`${BASE_PATH}/${id}`).then((r) => r.data);
}

/** `POST /exchange-requests/{id}/prepare` — `returns.requests.manage`. `ExpectedVersionRequest` — `expected_version` required (confirmed by reading `ExchangeRequestController::startPreparing` directly). */
export function startPreparingExchange(client: ApiClient, id: string, input: ReturnExpectedVersionInput): Promise<ExchangeRequestDTO> {
  return client
    .post<DataEnvelope<ExchangeRequestDTO>>(`${BASE_PATH}/${id}/prepare`, { expected_version: input.expectedVersion })
    .then((r) => r.data);
}

/** `POST /exchange-requests/{id}/ship` — `returns.requests.manage`. `MarkExchangeShippedRequest` — `tracking_number` optional, `expected_version` required (confirmed by reading it directly). */
export function markExchangeShipped(client: ApiClient, id: string, input: MarkExchangeShippedInput): Promise<ExchangeRequestDTO> {
  return client
    .post<DataEnvelope<ExchangeRequestDTO>>(`${BASE_PATH}/${id}/ship`, { tracking_number: input.trackingNumber || undefined, expected_version: input.expectedVersion })
    .then((r) => r.data);
}

/** `POST /exchange-requests/{id}/complete` — `returns.requests.manage`. `ExpectedVersionRequest` — `expected_version` required (confirmed by reading `ExchangeRequestController::complete` directly). The exchange-side counterpart to a refund's own automatic completion — settles the parent ReturnRequest to `completed`. */
export function completeExchange(client: ApiClient, id: string, input: ReturnExpectedVersionInput): Promise<ExchangeRequestDTO> {
  return client
    .post<DataEnvelope<ExchangeRequestDTO>>(`${BASE_PATH}/${id}/complete`, { expected_version: input.expectedVersion })
    .then((r) => r.data);
}

/** `POST /exchange-requests/{id}/cancel` — `returns.requests.cancel`. `ExpectedVersionRequest` — `expected_version` required (confirmed by reading `ExchangeRequestController::cancel` directly). */
export function cancelExchange(client: ApiClient, id: string, input: ReturnExpectedVersionInput): Promise<ExchangeRequestDTO> {
  return client
    .post<DataEnvelope<ExchangeRequestDTO>>(`${BASE_PATH}/${id}/cancel`, { expected_version: input.expectedVersion })
    .then((r) => r.data);
}
