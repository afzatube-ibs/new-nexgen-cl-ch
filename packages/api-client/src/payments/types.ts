/**
 * Phase 2.6 — Orders, Slice 2. Minimal, read-only — Payments' real
 * `GET /payments` list contract only (`PaymentController::index`, confirmed
 * by reading it directly), consumed here strictly to surface a real,
 * existing "Payments" relationship on Order Detail via Payments' own
 * genuinely server-supported `order_id` filter. No Payments module, no
 * capture/cancel/void/refund action is built — those belong to a distinct,
 * not-yet-built Payments admin module, and this phase's own brief
 * explicitly excludes Payment Capture/Refund.
 */

export type PaymentStatus = 'pending' | 'authorized' | 'captured' | 'failed' | 'cancelled' | 'voided' | 'partially_refunded' | 'refunded';

/** The exact shape `PaymentResource` returns from `index()` — `attempts` is a `whenLoaded()` relation, present only on `show()`, omitted here. */
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
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `PaymentController::index` — genuinely server-side `order_id`/`customer_id`/`status`, hardcoded `orderByDesc('initiated_at')`, Laravel's own default pagination. */
export interface ListPaymentsQuery {
  orderId?: string;
  customerId?: string;
  status?: PaymentStatus;
  page?: number;
}
