import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type {
  ReturnRequestDTO,
  ReturnExpectedVersionInput,
  RejectReturnRequestInput,
  SchedulePickupInput,
  ResolveReturnRequestInput,
} from './types.js';

/**
 * `apps/backend/.../Returns/routes.php` — the real Return Status Lifecycle,
 * one function per real `ReturnRequestWorkflowController` endpoint, whose
 * own docblock states it "mirrors Fulfillment's ShipmentWorkflowController
 * pattern exactly." Permission-gated server-side per its own granular key
 * (`returns.requests.{approve,cancel,manage,inspect,resolve}`, confirmed
 * via `routes.php` directly) — never re-derived or bypassed here; the
 * caller decides which of these to even offer.
 */
const BASE_PATH = '/return-requests';

function unwrap(client: ApiClient, path: string, body: Record<string, unknown>): Promise<ReturnRequestDTO> {
  return client.post<DataEnvelope<ReturnRequestDTO>>(path, body).then((r) => r.data);
}

/** `POST /return-requests/{id}/approve` — `returns.requests.approve`. */
export function approveReturnRequest(client: ApiClient, id: string, input: ReturnExpectedVersionInput): Promise<ReturnRequestDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/approve`, { expected_version: input.expectedVersion });
}

/** `POST /return-requests/{id}/reject` — `returns.requests.approve`. `reason` is `required` (`RejectReturnRequestRequest`). */
export function rejectReturnRequest(client: ApiClient, id: string, input: RejectReturnRequestInput): Promise<ReturnRequestDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/reject`, { reason: input.reason, expected_version: input.expectedVersion });
}

/** `POST /return-requests/{id}/cancel` — `returns.requests.cancel`. */
export function cancelReturnRequest(client: ApiClient, id: string, input: ReturnExpectedVersionInput): Promise<ReturnRequestDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/cancel`, { expected_version: input.expectedVersion });
}

/** `POST /return-requests/{id}/pickup` — `returns.requests.manage`. Both `providerCode`/`trackingNumber` genuinely optional. */
export function scheduleReturnPickup(client: ApiClient, id: string, input: SchedulePickupInput): Promise<ReturnRequestDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/pickup`, {
    provider_code: input.providerCode || undefined,
    tracking_number: input.trackingNumber || undefined,
    expected_version: input.expectedVersion,
  });
}

/** `POST /return-requests/{id}/receive` — `returns.requests.inspect`. */
export function markReturnReceived(client: ApiClient, id: string, input: ReturnExpectedVersionInput): Promise<ReturnRequestDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/receive`, { expected_version: input.expectedVersion });
}

/** `POST /return-requests/{id}/inspect` — `returns.requests.inspect`. */
export function startReturnInspection(client: ApiClient, id: string, input: ReturnExpectedVersionInput): Promise<ReturnRequestDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/inspect`, { expected_version: input.expectedVersion });
}

/**
 * `POST /return-requests/{id}/resolve` — `returns.requests.resolve`. Sends
 * every conditional field always; the real backend's own
 * `ResolveReturnRequestRequest` validates which ones are actually required
 * based on `resolution` — this wrapper does not pre-filter them.
 */
export function resolveReturnRequest(client: ApiClient, id: string, input: ResolveReturnRequestInput): Promise<ReturnRequestDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/resolve`, {
    resolution: input.resolution,
    resolution_notes: input.resolutionNotes || undefined,
    payment_id: input.paymentId || undefined,
    amount: input.amount || undefined,
    currency_code: input.currencyCode || undefined,
    desired_sku: input.desiredSku || undefined,
    desired_description: input.desiredDescription || undefined,
    desired_quantity: input.desiredQuantity ?? undefined,
    expected_version: input.expectedVersion,
  });
}
