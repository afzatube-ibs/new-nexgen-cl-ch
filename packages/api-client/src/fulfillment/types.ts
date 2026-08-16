/**
 * Phase 2.6 — Orders, Slice 2 (Order Operations & Merchant Workflow), extended
 * in Phase 2.8 Slice 1 (`planning/architecture/PHASE_2_8_SHIPPING_ARCHITECTURE.md`)
 * with `show()`'s full detail shape (items/timeline/notes) and the audit log,
 * in Phase 2.8 Slice 2 with the real Pick/Pack/Dispatch/In-Transit/
 * Deliver/Fail/Cancel workflow-action inputs (`workflow.ts`), and in Phase
 * 2.8 Slice 3 with the real Destination/Weight/Item/Note management inputs
 * (`destination.ts`/`items.ts`/`notes.ts`) — the "Shipment Preparation"
 * capabilities Slice 2's own brief explicitly deferred. Every field below is
 * the exact camelCase shape of the real `ShipmentResource`/
 * `ShipmentItemResource`/`ShipmentTimelineEventResource`/
 * `ShipmentNoteResource`/`AuditLogResource`, confirmed by reading each
 * directly.
 */

export type ShipmentStatus = 'pending' | 'picking' | 'picked' | 'packing' | 'packed' | 'dispatched' | 'in_transit' | 'delivered' | 'failed' | 'cancelled';

export interface ShipmentItemDTO {
  id: string;
  /** Plain string, never a Catalog foreign key — confirmed via `ShipmentItem`'s own docblock, same pattern as `order_items.sku`. */
  sku: string;
  description: string | null;
  quantity: number;
}

export interface ShipmentTimelineEventDTO {
  id: string;
  eventType: string;
  description: string;
  occurredAt: string;
}

export interface ShipmentNoteDTO {
  id: string;
  authorId: string | null;
  body: string;
  isCustomerVisible: boolean;
  createdAt: string;
}

/** The exact shape `ShipmentResource` returns. `items`/`timeline`/`notes` are `whenLoaded()` relations — present only from `getShipment()` (`show()`), always `undefined` from `listShipments()` (`index()`), confirmed by reading `ShipmentController` directly (`index()` never calls `->load(...)`, `show()` always does). */
export interface ShipmentDTO {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  grandTotal: string | null;
  currencyCode: string | null;
  shippingMethodId: string | null;
  courierProviderCode: string | null;
  courierConsignmentId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  destination: {
    recipientName: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    countryCode: string | null;
  };
  weightGrams: number | null;
  status: ShipmentStatus;
  failureReason: string | null;
  pickedAt: string | null;
  packedAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  version: number;
  items?: ShipmentItemDTO[];
  timeline?: ShipmentTimelineEventDTO[];
  notes?: ShipmentNoteDTO[];
  createdAt: string | null;
  updatedAt: string | null;
}

/** `ShipmentController::index` — genuinely server-side `status`/`order_id`, hardcoded `orderByDesc('created_at')`, Laravel's own default pagination. No free-text `search`, no `warehouse_id` filter — `Shipment` has no warehouse field at all (confirmed via the model's own docblock; see the Slice 1 completion report). */
export interface ListShipmentsQuery {
  status?: ShipmentStatus;
  orderId?: string;
  page?: number;
}

export const FULFILLMENT_SHIPMENT_TARGET_TYPE = 'App\\Domains\\Operations\\Fulfillment\\Models\\Shipment';

export interface FulfillmentAuditLogDTO {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  correlationId: string | null;
  createdAt: string;
}

/** `AuditLogController::index` (Fulfillment's own) — `actor_id`/`target_type`/`per_page` only, confirmed by reading it directly. No `target_id` filter. */
export interface ListFulfillmentAuditLogsQuery {
  targetType?: string;
  actorId?: string;
  page?: number;
  perPage?: number;
}

// ---------------------------------------------------------------------------
// Workflow actions — Phase 2.8 Slice 2. One input type per real
// `ShipmentWorkflowController` endpoint, confirmed against each one's own
// `Http\Requests` class directly.
// ---------------------------------------------------------------------------

/** Shared by `startPicking`/`markPicked`/`startPacking`/`markPacked`/`markInTransit`/`markDelivered` — each takes only `expected_version` (`ExpectedVersionRequest`). */
export interface ExpectedVersionInput {
  expectedVersion: number;
}

/** `DispatchShipmentRequest` — both fields genuinely optional; a caller with no `shippingMethodId` and no `trackingNumber` gets the real `tracking_number_required` 422 `DispatchShipmentAction` throws when no courier can be auto-booked (every provider in this installation reports unavailable — see the Slice 1/2 completion reports). */
export interface DispatchShipmentInput {
  shippingMethodId?: string | null;
  trackingNumber?: string | null;
  expectedVersion: number;
}

/** `MarkFailedRequest` — `reason` is `required`, unlike `CancelShipmentInput`'s own optional one. */
export interface MarkFailedInput {
  reason: string;
  expectedVersion: number;
}

/** `CancelShipmentRequest` — `reason` is genuinely optional. */
export interface CancelShipmentInput {
  reason?: string | null;
  expectedVersion: number;
}

// ---------------------------------------------------------------------------
// Shipment Preparation — Phase 2.8 Slice 3. Destination/weight, items, and
// notes, confirmed against each real `Http\Requests` class directly.
// ---------------------------------------------------------------------------

/**
 * `SetShipmentDestinationRequest` — the SAME real endpoint (`PATCH .../
 * destination`) carries both the destination address and `weightGrams`;
 * there is no separate weight-only endpoint (confirmed by reading
 * `SetShipmentDestinationAction`'s own `TRACKED_FIELDS` directly). Every
 * field below except `addressLine2`/`region`/`postalCode`/`weightGrams` is
 * `required` on the real request, every single call — a caller cannot
 * update weight alone without resending the rest of the destination too.
 */
export interface SetShipmentDestinationInput {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  countryCode: string;
  weightGrams?: number | null;
  expectedVersion: number;
}

/** `AddShipmentItemRequest` — `sku`/`quantity` required, `description` optional. */
export interface AddShipmentItemInput {
  sku: string;
  description?: string | null;
  quantity: number;
}

/** `AddShipmentNoteRequest` — `body` required, `isCustomerVisible` optional (defaults false server-side via `$request->boolean(...)`). */
export interface AddShipmentNoteInput {
  body: string;
  isCustomerVisible?: boolean;
}
