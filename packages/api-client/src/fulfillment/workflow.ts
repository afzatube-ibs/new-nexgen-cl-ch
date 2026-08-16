import type { ApiClient } from '../client.js';
import type { DataEnvelope } from '../types.js';
import type { ShipmentDTO, ExpectedVersionInput, DispatchShipmentInput, MarkFailedInput, CancelShipmentInput } from './types.js';

/**
 * `apps/backend/.../Fulfillment/routes.php` — the real Shipment Status
 * Lifecycle, one function per `ShipmentWorkflowController` endpoint.
 * Permission-gated server-side per its own granular key
 * (`fulfillment.shipments.{pick,pack,dispatch,cancel}` — confirmed via
 * `PermissionRegistry.php` directly), never re-derived or bypassed here;
 * the caller (`useShipmentWorkflow.ts`) is what decides which of these to
 * even offer, via `RequirePermission`/`useAuth().can()`.
 */
const BASE_PATH = '/shipments';

function unwrap(client: ApiClient, path: string, body: Record<string, unknown>): Promise<ShipmentDTO> {
  return client.post<DataEnvelope<ShipmentDTO>>(path, body).then((r) => r.data);
}

/** `POST /shipments/{id}/pick/start` — `fulfillment.shipments.pick`. Real backend precondition: at least one item (`StartPickingAction`'s own `no_items` guard) — this wrapper does not check it; the caller does, client-side, to avoid offering a button that will always 422. */
export function startPicking(client: ApiClient, id: string, input: ExpectedVersionInput): Promise<ShipmentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/pick/start`, { expected_version: input.expectedVersion });
}

/** `POST /shipments/{id}/pick/complete` — `fulfillment.shipments.pick`. */
export function markPicked(client: ApiClient, id: string, input: ExpectedVersionInput): Promise<ShipmentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/pick/complete`, { expected_version: input.expectedVersion });
}

/** `POST /shipments/{id}/pack/start` — `fulfillment.shipments.pack`. */
export function startPacking(client: ApiClient, id: string, input: ExpectedVersionInput): Promise<ShipmentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/pack/start`, { expected_version: input.expectedVersion });
}

/** `POST /shipments/{id}/pack/complete` — `fulfillment.shipments.pack`. Real backend precondition: a recorded `weight_grams` (`MarkPackedAction`'s own `missing_weight` guard, settable only via the destination endpoint — out of this slice's own scope, see the completion report). */
export function markPacked(client: ApiClient, id: string, input: ExpectedVersionInput): Promise<ShipmentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/pack/complete`, { expected_version: input.expectedVersion });
}

/** `POST /shipments/{id}/dispatch` — `fulfillment.shipments.dispatch`. Real backend precondition: `hasDestination()` (`DispatchShipmentAction`'s own `missing_destination` guard). `shippingMethodId`/`trackingNumber` both genuinely optional per `DispatchShipmentRequest`. */
export function dispatchShipment(client: ApiClient, id: string, input: DispatchShipmentInput): Promise<ShipmentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/dispatch`, {
    shipping_method_id: input.shippingMethodId || undefined,
    tracking_number: input.trackingNumber || undefined,
    expected_version: input.expectedVersion,
  });
}

/** `POST /shipments/{id}/in-transit` — `fulfillment.shipments.dispatch`. */
export function markInTransit(client: ApiClient, id: string, input: ExpectedVersionInput): Promise<ShipmentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/in-transit`, { expected_version: input.expectedVersion });
}

/** `POST /shipments/{id}/deliver` — `fulfillment.shipments.dispatch`. */
export function markDelivered(client: ApiClient, id: string, input: ExpectedVersionInput): Promise<ShipmentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/deliver`, { expected_version: input.expectedVersion });
}

/** `POST /shipments/{id}/fail` — `fulfillment.shipments.cancel`. `reason` is `required` (`MarkFailedRequest`). */
export function markFailed(client: ApiClient, id: string, input: MarkFailedInput): Promise<ShipmentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/fail`, { reason: input.reason, expected_version: input.expectedVersion });
}

/** `POST /shipments/{id}/cancel` — `fulfillment.shipments.cancel`. `reason` is optional (`CancelShipmentRequest`). */
export function cancelShipment(client: ApiClient, id: string, input: CancelShipmentInput): Promise<ShipmentDTO> {
  return unwrap(client, `${BASE_PATH}/${id}/cancel`, { reason: input.reason || undefined, expected_version: input.expectedVersion });
}
