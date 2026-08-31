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

/** `NotificationDeliveryAttemptResource` — a real, per-attempt provider-level record, present only on `NotificationDTO.deliveryAttempts` (a `whenLoaded()` relation, only ever populated by `getNotification`'s own single-item `show()` call). */
export interface NotificationDeliveryAttemptDTO {
  id: string;
  providerCode: string | null;
  status: string;
  providerReference: string | null;
  failureReason: string | null;
  occurredAt: string;
}

/** The exact shape `NotificationResource` returns. `deliveryAttempts` is `[]` from `listNotifications` (never loaded there) and real, populated data from `getNotification`. Real backend limitation, confirmed by reading `NotificationResource` directly: no rendered `body`/merged content is ever returned — this Resource is delivery-status metadata only. */
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
  deliveryAttempts: NotificationDeliveryAttemptDTO[];
  createdAt: string | null;
  updatedAt: string | null;
}

/** `NotificationWorkflowController::cancel` — `ExpectedVersionRequest`. `retry` (see `retryNotification`) deliberately takes none — `RetryNotificationAction` performs no optimistic-lock check, confirmed by reading `NotificationWorkflowController::retry` directly (a plain `Request`, not `ExpectedVersionRequest`). */
export interface CancelNotificationInput {
  expectedVersion: number;
}

export type NotificationTemplateChannel = 'email' | 'sms' | 'whatsapp' | 'in_app';

/** `NotificationTemplateResource` — `is_active` gates whether `Channels\ProviderResolver`'s own send path will use this template at all (confirmed via `QueueNotificationAction`). No archive/delete endpoint exists — a template is deactivated, never removed. */
export interface NotificationTemplateDTO {
  id: string;
  code: string;
  channel: NotificationTemplateChannel;
  locale: string;
  subject: string | null;
  body: string;
  isActive: boolean;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `NotificationTemplateController::index` — real server-side `channel`/`code`/`q` (a genuine in-module free-text search over `code`/`subject`/`body`, confirmed by reading it directly — never routed through Search), hardcoded `orderBy('code')`, Laravel's own default pagination. */
export interface ListNotificationTemplatesQuery {
  channel?: NotificationTemplateChannel;
  code?: string;
  q?: string;
  page?: number;
}

/** `CreateNotificationTemplateRequest` — `code`/`channel`/`body` required; `locale` defaults server-side (`NotificationTemplate::booted()`, confirmed by reading it directly) when omitted. */
export interface CreateNotificationTemplateInput {
  code: string;
  channel: NotificationTemplateChannel;
  locale?: string;
  subject?: string | null;
  body: string;
  isActive?: boolean;
}

/** `UpdateNotificationTemplateRequest` — deliberately narrower than create: `code`/`channel`/`locale` are not editable after creation (confirmed absent from the real validation rules), only `subject`/`body`/`isActive`. */
export interface UpdateNotificationTemplateInput {
  subject?: string | null;
  body?: string;
  isActive?: boolean;
  expectedVersion: number;
}

export const NOTIFICATION_TEMPLATE_TARGET_TYPE = 'App\\Domains\\Operations\\Notifications\\Models\\NotificationTemplate';
export const NOTIFICATION_TARGET_TYPE = 'App\\Domains\\Operations\\Notifications\\Models\\Notification';

export interface NotificationsAuditLogDTO {
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

/** `AuditLogController::index` (Notifications' own) — mirrors every other module's own audit-log query shape exactly: `actor_id`/`target_type`/`per_page` only, no `target_id` filter. */
export interface ListNotificationsAuditLogsQuery {
  targetType?: string;
  actorId?: string;
  page?: number;
  perPage?: number;
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
