import { Mail } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Text, Badge, Skeleton, ErrorState } from '@nexgen/ui';
import type { NotificationDTO, NotificationStatus } from '@nexgen/api-client';
import { useOrderNotifications } from '../shared/queries.js';

const STATUS_VARIANT: Record<NotificationStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'default',
  queued: 'default',
  sending: 'warning',
  sent: 'success',
  failed: 'danger',
  cancelled: 'danger',
};

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

/**
 * Notifications — `notifications.notifications.view`, a real,
 * server-filtered read of Notifications' own `GET /notifications?
 * related_type=order&related_id=` (`NotificationController::index`,
 * confirmed by reading it directly). A real, existing cross-domain
 * relationship: placing an order already queues a real order-confirmation
 * email today, via the platform's own already-live
 * `SendOrderConfirmationOnOrderPlaced` listener (`related_type: 'order'`,
 * confirmed by reading that listener directly) — this card answers the
 * real merchant question "did the customer's confirmation email actually
 * go out?" with real delivery status, not a guess.
 *
 * A separate permission from `orders.*`. Read-only: no retry/cancel/
 * template-authoring action is built here — those belong to a distinct,
 * not-yet-built Notifications admin module.
 */
export function OrderNotificationsCard({ orderId }: { orderId: string }) {
  const { data, status, refetch } = useOrderNotifications(orderId);
  const notifications = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'pending' && (
          <div className="flex flex-col gap-2">
            <Skeleton shape="block" className="h-10 w-full" />
          </div>
        )}
        {status === 'error' && <ErrorState onRetry={() => void refetch()} />}
        {status === 'success' && notifications.length === 0 && (
          <div className="flex items-center gap-2 text-text-secondary">
            <Mail className="size-4" aria-hidden="true" />
            <Text variant="body">No notifications sent yet.</Text>
          </div>
        )}
        {status === 'success' && notifications.length > 0 && (
          <div className="flex flex-col divide-y divide-border">
            {notifications.map((notification: NotificationDTO) => (
              <div key={notification.id} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Text variant="body-strong" className="capitalize">
                    {notification.channel}
                  </Text>
                  <Badge variant={STATUS_VARIANT[notification.status]}>{notification.status}</Badge>
                </div>
                <Text variant="caption" className="text-text-secondary">
                  {notification.recipient} ·{' '}
                  {notification.sentAt
                    ? `Sent ${formatDateTime(notification.sentAt)}`
                    : notification.failedAt
                      ? `Failed ${formatDateTime(notification.failedAt)}`
                      : `Queued ${formatDateTime(notification.createdAt)}`}
                </Text>
                {notification.status === 'failed' && notification.failureReason && (
                  <Text variant="caption" className="text-feedback-danger">
                    {notification.failureReason}
                  </Text>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
