/**
 * Phase 2.6 — Orders, Slice 2. Minimal, read-only — Notifications' real
 * `GET /notifications` list contract only (`NotificationController::index`,
 * confirmed by reading it directly), consumed here strictly to surface a
 * real, existing "Notification" relationship on Order Detail via
 * Notifications' own genuinely server-supported `related_type`/
 * `related_id` filter pair. The exact `related_type` value an Order's own
 * confirmation email is queued with — `'order'` — is confirmed by reading
 * `app/Listeners/SendOrderConfirmationOnOrderPlaced.php` directly, not
 * assumed. No Notifications module, no retry/cancel/template-authoring
 * capability is built — those belong to a distinct, not-yet-built
 * Notifications admin module this slice's own brief never asked for.
 */

export type NotificationStatus = 'pending' | 'queued' | 'sending' | 'sent' | 'failed' | 'cancelled';

export const ORDER_RELATED_TYPE = 'order';
/** `app/Listeners/SendPaymentReceiptOnPaymentCaptured.php` — confirmed by reading it directly: `relatedId` is the real Payment's own id, never the parent Order's. */
export const PAYMENT_RELATED_TYPE = 'payment';
/** `app/Listeners/SendShipmentNoticeOnShipmentDispatched.php` — confirmed by reading it directly: `relatedId` is the real Shipment's own id, never the parent Order's. */
export const SHIPMENT_RELATED_TYPE = 'shipment';

/** The exact shape `NotificationResource` returns from `index()` — `deliveryAttempts` is a `whenLoaded()` relation, present only on `show()`, omitted here. */
export interface NotificationDTO {
  id: string;
  templateId: string | null;
  channel: string;
  recipient: string;
  subject: string | null;
  status: NotificationStatus;
  relatedType: string | null;
  relatedId: string | null;
  providerCode: string | null;
  attemptsCount: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lastAttemptedAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  failureReason: string | null;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `NotificationController::index` — genuinely server-side `status`/`channel`/`related_type`+`related_id` (a pair — the backend only applies either filter when BOTH are present, confirmed by reading the controller directly), hardcoded `orderByDesc('created_at')`, Laravel's own default pagination. */
export interface ListNotificationsQuery {
  status?: NotificationStatus;
  channel?: string;
  relatedType?: string;
  relatedId?: string;
  page?: number;
}

/** `NotificationProviderController::index` / `Channels\Contracts\NotificationProviderContract` — a code-and-config-defined provider, not an Eloquent row. */
export interface NotificationProviderDTO {
  code: string;
  label: string;
  channel: string;
  available: boolean;
}
