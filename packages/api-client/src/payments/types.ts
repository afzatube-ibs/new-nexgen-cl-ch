/**
 * Phase 2.6 — Orders, Slice 2 built the minimal `list`-only read of
 * Payments' real `GET /payments` (`PaymentController::index`) to surface a
 * summary on Order Detail's own `OrderPaymentsCard`. Phase 2.9 — Payments,
 * Slice 1 extended this with everything a dedicated, real Merchant Payment
 * Management admin needs: `get` (the real `show()`, which eager-loads
 * `attempts` — the real transaction/timeline ledger), the real gateway
 * registry (`GET /payments/methods`), and Payments' own real Audit Log
 * (`GET /payments/audit-logs`) — read-only. Slice 2 ("Merchant Payment
 * Operations") adds the real write actions this backend actually exposes:
 * Capture/Cancel/Void (`PaymentActionController`) and the Bank Transfer
 * verification workflow — attach proof, approve (captures), reject (marks
 * failed) — `BankTransferVerificationController`. No Refund/Authorize/
 * Retry/Initiate action is wrapped — `Authorize`/`Initiate` have no admin
 * route at all (confirmed by reading `routes.php` directly — `Initiate` is
 * Checkout's own entry point, not an admin operation), `Retry` does not
 * exist as a distinct backend capability, and Refunds are entirely Returns'
 * concern (confirmed via `RefundableGateway`'s own docblock and the absence
 * of any `POST /payments/{id}/refund` route) — all per this slice's own
 * explicit "Do NOT build" list.
 */

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'cancelled' | 'voided' | 'partially_refunded' | 'refunded';

/** The exact shape `PaymentResource` returns. `attempts` is a `whenLoaded()` relation — present on `show()`, always `[]` from `index()`. Note: the real backend resource does not expose `amountRefunded`/`refundedAt` even though both are real, populated columns — confirmed by reading `PaymentResource` directly, not omitted here by choice. */
export interface PaymentDTO {
  id: string;
  orderId: string;
  customerId: string | null;
  gatewayCode: string;
  currencyCode: string;
  amount: string;
  amountCaptured: string;
  status: PaymentStatus;
  proofReference: string | null;
  redirectUrl: string | null;
  instructions: string | null;
  failureReason: string | null;
  initiatedAt: string;
  authorizedAt: string | null;
  capturedAt: string | null;
  cancelledAt: string | null;
  failedAt: string | null;
  attempts: PaymentAttemptDTO[];
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export type PaymentAttemptType = 'initiation' | 'authorization' | 'capture' | 'cancellation' | 'void' | 'failure' | 'webhook' | 'refund';
export type PaymentAttemptStatus = 'pending' | 'succeeded' | 'failed';

/** `PaymentAttemptResource` — the real transaction/timeline ledger for one Payment. Deliberately excludes the gateway's raw `request_payload`/`response_payload` (Confidential, available only via the Audit Log), confirmed by reading the resource's own docblock. */
export interface PaymentAttemptDTO {
  id: string;
  type: PaymentAttemptType;
  status: PaymentAttemptStatus;
  gatewayCode: string;
  gatewayReference: string | null;
  amount: string | null;
  currencyCode: string | null;
  failureReason: string | null;
  occurredAt: string;
}

/** `PaymentController::index` — genuinely server-side `order_id`/`customer_id`/`status`, hardcoded `orderByDesc('initiated_at')`, Laravel's own default pagination. No free-text search, no `gateway_code` filter — confirmed absent by reading the controller directly. */
export interface ListPaymentsQuery {
  orderId?: string;
  customerId?: string;
  status?: PaymentStatus;
  page?: number;
}

/** `GET /payments/methods` — `PaymentMethodResource`, the real gateway registry (`GatewayResolver::availableGateways()`). The correct source for a gateway-code-to-label lookup — never a hardcoded frontend map. */
export interface PaymentMethodDTO {
  code: string;
  label: string;
}

export const PAYMENT_TARGET_TYPE = 'App\\Domains\\Commerce\\Payments\\Models\\Payment';

/** `AuditLogController::index` (Payments' own) — the identical flat, append-only shape every other module's own audit log already uses. */
export interface PaymentAuditLogDTO {
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

/** `actor_id`/`target_type`/`per_page` only, confirmed by reading the controller directly. No `target_id` filter. */
export interface ListPaymentAuditLogsQuery {
  targetType?: string;
  actorId?: string;
  page?: number;
  perPage?: number;
}

// ---------------------------------------------------------------------------
// Merchant Payment Operations — Phase 2.9 Slice 2. One input type per real
// `PaymentActionController`/`BankTransferVerificationController` endpoint,
// confirmed against each one's own `Http\Requests` class directly.
// ---------------------------------------------------------------------------

/** Shared by `capture` (`ExpectedVersionRequest`) — the only input is `expected_version`; the backend always captures the payment's own full original `amount`, no override, no gateway reference from the caller (that's the automated-gateway path's own concern, not this manual/operator one). Also shared by `bank-transfer/approve`, which internally reuses this same real endpoint's own request shape. Named `Payment*` (not the bare `ExpectedVersionInput` Fulfillment's own workflow types already use) to avoid a barrel-export name collision between the two sibling modules. */
export interface PaymentExpectedVersionInput {
  expectedVersion: number;
}

/** `CancelPaymentRequest`/`VoidPaymentRequest` — `reason` is `required` on both (unlike Shipping's own `CancelShipmentRequest`, which made it optional) — confirmed by reading each request class directly. */
export interface PaymentReasonInput {
  reason: string;
  expectedVersion: number;
}

/** `AttachBankTransferProofRequest` — `proof_reference` is a plain identifier string (a future Media-module attachment id), never a file upload this request itself handles. */
export interface AttachBankTransferProofInput {
  proofReference: string;
  expectedVersion: number;
}
