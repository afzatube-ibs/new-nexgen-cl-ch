/**
 * Production Completion Plan v2, Milestone 7 (Admin: Fulfillment & Returns
 * UI) — Returns half. Fulfillment's own Admin UI (`packages/api-client/src/
 * fulfillment/`, `apps/admin/src/modules/shipping/`) was found already
 * fully shipped; this is the genuinely-missing counterpart, mirroring that
 * package's own file layout and conventions exactly. Every field below is
 * the real camelCase shape of `ReturnRequestResource`/
 * `ReturnRequestItemResource`/`ReturnTimelineEventResource`/
 * `ReturnNoteResource`/`RefundRequestResource`/`ExchangeRequestResource`,
 * confirmed by reading each directly, and every input type matches its own
 * real `Http\Requests` class, also confirmed by reading each directly.
 */

export const RETURN_TYPE_RETURN = 'return';
export const RETURN_TYPE_EXCHANGE = 'exchange';
export type ReturnRequestType = typeof RETURN_TYPE_RETURN | typeof RETURN_TYPE_EXCHANGE;

/** `ReturnRequest::REASON_*` constants, confirmed by reading the model directly. */
export type ReturnRequestReason = 'damaged' | 'wrong_item' | 'courier_damage' | 'delivery_refused' | 'changed_mind' | 'other';

/**
 * `ReturnRequest::STATUS_*` constants and `ALLOWED_TRANSITIONS`, confirmed
 * by reading the model directly:
 * ```
 * requested          => [approved, rejected, cancelled]
 * approved           => [pickup_scheduled, rejected, cancelled]
 * pickup_scheduled   => [received, rejected, cancelled]
 * received           => [inspecting, rejected]
 * inspecting         => [resolution_approved, rejected]
 * resolution_approved=> [completed]
 * completed          => []
 * rejected           => []
 * cancelled          => []
 * ```
 * No explicit staff-facing "complete" action exists for the parent
 * ReturnRequest itself — `resolution_approved` → `completed` happens via
 * event-bus side effects for a refund, or via `ExchangeRequestController::
 * complete()` for an exchange (see `exchangeRequests.ts`).
 */
export type ReturnRequestStatus =
  | 'requested'
  | 'approved'
  | 'pickup_scheduled'
  | 'received'
  | 'inspecting'
  | 'resolution_approved'
  | 'completed'
  | 'rejected'
  | 'cancelled';

/** `ReturnRequest::RESOLUTION_*` constants. */
export type ReturnResolution = 'refund' | 'exchange' | 'reject';

export interface ReturnRequestItemDTO {
  id: string;
  sku: string;
  description: string | null;
  quantity: number;
}

export interface ReturnTimelineEventDTO {
  id: string;
  eventType: string;
  description: string;
  occurredAt: string;
}

export interface ReturnNoteDTO {
  id: string;
  authorId: string | null;
  body: string;
  isCustomerVisible: boolean;
  createdAt: string;
}

/**
 * `RefundRequest::STATUS_*` constants and their own real `TRANSITIONS`,
 * confirmed by reading the model directly:
 * ```
 * pending    => [processing, failed]
 * processing => [completed, failed]
 * completed  => []
 * failed     => [processing]   (retryable — see `retryRefundRequest`)
 * ```
 */
export type RefundRequestStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** `RefundRequestResource` — always embedded as `ReturnRequestDTO.refundRequest` once a `refund` resolution exists; also independently listable/fetchable via `refundRequests.ts`. */
export interface RefundRequestDTO {
  id: string;
  returnRequestId: string;
  paymentId: string;
  amount: string;
  currencyCode: string;
  status: RefundRequestStatus;
  gatewayReference: string | null;
  failureReason: string | null;
  requestedAt: string | null;
  completedAt: string | null;
  version: number;
}

/**
 * `ExchangeRequest::STATUS_*` constants and their own real `TRANSITIONS`,
 * confirmed by reading the model directly:
 * ```
 * pending   => [preparing, cancelled]
 * preparing => [shipped, cancelled]
 * shipped   => [completed]
 * completed => []
 * cancelled => []
 * ```
 */
export type ExchangeRequestStatus = 'pending' | 'preparing' | 'shipped' | 'completed' | 'cancelled';

/** `ExchangeRequestResource` — always embedded as `ReturnRequestDTO.exchangeRequest` once an `exchange` resolution exists; also independently listable/fetchable via `exchangeRequests.ts`. */
export interface ExchangeRequestDTO {
  id: string;
  returnRequestId: string;
  desiredSku: string;
  desiredDescription: string | null;
  desiredQuantity: number;
  status: ExchangeRequestStatus;
  trackingNumber: string | null;
  completedAt: string | null;
  version: number;
}

/**
 * `ReturnRequestResource` — the exact shape `toArray()` returns.
 * `items`/`timeline`/`notes`/`refundRequest`/`exchangeRequest` are all
 * `whenLoaded()` relations: present only from `getReturnRequest()`
 * (`show()`, which eager-loads all five — confirmed by reading
 * `ReturnRequestController::show()` directly, no `whenLoaded()` gap here),
 * always `undefined` from `listReturnRequests()` (`index()`, which loads
 * none of them).
 */
export interface ReturnRequestDTO {
  id: string;
  orderId: string;
  customerId: string;
  rmaNumber: string;
  type: ReturnRequestType;
  reason: ReturnRequestReason;
  reasonDetails: string | null;
  status: ReturnRequestStatus;
  resolution: ReturnResolution | null;
  resolutionNotes: string | null;
  rejectionReason: string | null;
  pickup: {
    providerCode: string | null;
    trackingNumber: string | null;
    scheduledAt: string | null;
  };
  receivedAt: string | null;
  inspectionStartedAt: string | null;
  resolvedAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  version: number;
  items?: ReturnRequestItemDTO[];
  timeline?: ReturnTimelineEventDTO[];
  notes?: ReturnNoteDTO[];
  refundRequest?: RefundRequestDTO | null;
  exchangeRequest?: ExchangeRequestDTO | null;
  createdAt: string;
  updatedAt: string;
}

/** `ReturnRequestController::index()` — `status`/`order_id`/`customer_id`, confirmed by reading it directly. No free-text search. */
export interface ListReturnRequestsQuery {
  status?: ReturnRequestStatus;
  orderId?: string;
  customerId?: string;
  page?: number;
}

/** `RefundRequestController::index()` — `status` only, confirmed by reading it directly. */
export interface ListRefundRequestsQuery {
  status?: RefundRequestStatus;
  page?: number;
}

/** `ExchangeRequestController::index()` — `status` only, confirmed by reading it directly. */
export interface ListExchangeRequestsQuery {
  status?: ExchangeRequestStatus;
  page?: number;
}

/** `CreateReturnRequestRequest` — `order_id`/`customer_id` required UUIDs, `type` optional (defaults to `return` server-side), `reason` a required enum, `items` a required array of `{ sku, quantity }`. */
export interface CreateReturnRequestInput {
  orderId: string;
  customerId: string;
  type?: ReturnRequestType;
  reason: ReturnRequestReason;
  reasonDetails?: string | null;
  items: Array<{ sku: string; quantity: number }>;
}

export const RETURN_REQUEST_TARGET_TYPE = 'App\\Domains\\Operations\\Returns\\Models\\ReturnRequest';

export interface ReturnsAuditLogDTO {
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

/** `AuditLogController::index` (Returns' own) — mirrors Fulfillment's own audit-log query shape exactly. */
export interface ListReturnsAuditLogsQuery {
  targetType?: string;
  actorId?: string;
  page?: number;
  perPage?: number;
}

// ---------------------------------------------------------------------------
// Workflow actions — one input type per real `ReturnRequestWorkflowController`
// endpoint, confirmed against its own controller method (which real
// `Http\Requests` class it type-hints) directly.
// ---------------------------------------------------------------------------

/**
 * Shared by `approve`/`cancel`/`markReceived`/`startInspection` — each
 * takes only `expected_version` (`ExpectedVersionRequest`). Named
 * `ReturnExpectedVersionInput`, not the bare `ExpectedVersionInput`
 * Fulfillment's own `types.ts` already declares — this package's root
 * `index.ts` barrel-exports every domain's `types.ts` with `export *`, so
 * the bare name would collide there (mirrors `PaymentExpectedVersionInput`'s
 * own identical domain-prefixing, for the identical reason).
 */
export interface ReturnExpectedVersionInput {
  expectedVersion: number;
}

/** `RejectReturnRequestRequest` — `reason` required. Used by both `reject()` (the requested/approved/pickup_scheduled/received/inspecting path) and is distinct from `resolve()`'s own `reject` resolution. */
export interface RejectReturnRequestInput {
  reason: string;
  expectedVersion: number;
}

/** `SchedulePickupRequest` — both `providerCode`/`trackingNumber` genuinely optional. */
export interface SchedulePickupInput {
  providerCode?: string | null;
  trackingNumber?: string | null;
  expectedVersion: number;
}

/**
 * `ResolveReturnRequestRequest` — `resolution` one of `refund`/`exchange`/
 * `reject`; `paymentId`/`amount`/`currencyCode` required only when
 * `resolution === 'refund'`; `desiredSku`/`desiredDescription`/
 * `desiredQuantity` required only when `resolution === 'exchange'`;
 * `resolutionNotes` always optional; `expectedVersion` always required.
 * This wrapper does not enforce the conditional requirement — the caller
 * (the Resolve dialog) does, client-side, matching every other workflow
 * wrapper's own division of labor in this codebase.
 */
export interface ResolveReturnRequestInput {
  resolution: ReturnResolution;
  resolutionNotes?: string | null;
  paymentId?: string;
  amount?: string;
  currencyCode?: string;
  desiredSku?: string;
  desiredDescription?: string | null;
  desiredQuantity?: number;
  expectedVersion: number;
}

/** `ReturnNoteController::store()` — `body` required, `isCustomerVisible` optional. */
export interface AddReturnNoteInput {
  body: string;
  isCustomerVisible?: boolean;
}

/** `MarkExchangeShippedRequest` — `tracking_number` optional (`sometimes`/`nullable`), `expected_version` required, confirmed by reading it directly. */
export interface MarkExchangeShippedInput {
  trackingNumber?: string | null;
  expectedVersion: number;
}
