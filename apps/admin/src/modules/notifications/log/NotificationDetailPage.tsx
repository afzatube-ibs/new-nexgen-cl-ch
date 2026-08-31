import type { ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Copy, History, RotateCw, Ban, Mail, CheckCircle2, XCircle } from 'lucide-react';
import { Text, Badge, Button, Card, CardHeader, CardTitle, CardContent, Skeleton, ErrorState, useToast } from '@nexgen/ui';
import type { NotificationStatus } from '@nexgen/api-client';
import { ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { notificationsErrorMessage } from '../shared/errors.js';
import { useNotification, useRetryNotification, useCancelNotification } from '../shared/queries.js';

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

function OverviewField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <Text variant="caption" className="text-text-secondary">
        {label}
      </Text>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

/**
 * Notification Detail — a dedicated route (`notifications/log/:id`),
 * mirroring Payment Detail's own shape. `NotificationController::show`
 * is the only endpoint that loads `deliveryAttempts` — this page's one
 * `useNotification(id)` query is the single source for Overview and the
 * Delivery Timeline both.
 *
 * **No rendered message content shown** — `NotificationResource` never
 * returns the real merged `body`/`subject` content that was actually
 * sent (confirmed by reading it directly), only delivery-status
 * metadata; this page shows exactly that, honestly, rather than
 * fabricating a preview from the linked template's own unmerged body.
 */
export function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: notification, status: queryStatus, refetch } = useNotification(id);
  const retryMutation = useRetryNotification();
  const cancelMutation = useCancelNotification();

  async function handleCopyId(): Promise<void> {
    if (!notification) return;
    await navigator.clipboard.writeText(notification.id);
    toast({ variant: 'success', title: 'Notification ID copied' });
  }

  if (queryStatus === 'pending') {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton shape="block" className="h-8 w-64" />
        <Skeleton shape="block" className="h-40 w-full" />
        <Skeleton shape="block" className="h-40 w-full" />
      </div>
    );
  }

  if (queryStatus === 'error' || !notification) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const attempts = notification.deliveryAttempts;

  return (
    <div>
      <button
        type="button"
        onClick={() => void navigate('/notifications/log')}
        className="mb-3 inline-flex items-center gap-1 text-label text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Notifications
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Text as="h1" variant="heading" className="capitalize">
              {notification.channel} to {notification.recipient}
            </Text>
            <Badge variant={STATUS_VARIANT[notification.status]}>{notification.status}</Badge>
          </div>
          {notification.subject && (
            <Text variant="body" className="mt-1 text-text-secondary">
              {notification.subject}
            </Text>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {notification.status === 'failed' && notification.failureReason && (
          <Card className="border-feedback-danger/40">
            <CardContent className="flex items-start gap-2.5 pt-4">
              <XCircle className="mt-0.5 size-4 shrink-0 text-feedback-danger" aria-hidden="true" />
              <div>
                <Text variant="body-strong">Delivery failed</Text>
                <Text variant="body" className="text-text-secondary">
                  {notification.failureReason}
                </Text>
              </div>
            </CardContent>
          </Card>
        )}

        <RequirePermission anyOf={['notifications.notifications.manage']} inline={null}>
          {(notification.status === 'failed' || notification.status === 'pending' || notification.status === 'queued') && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                {notification.status === 'failed' && (
                  <Button onClick={() => void retryMutation.mutateAsync({ id: notification.id })} loading={retryMutation.isPending}>
                    <RotateCw className="size-4" /> Retry
                  </Button>
                )}
                {(notification.status === 'pending' || notification.status === 'queued') && (
                  <ConfirmDialog
                    trigger={
                      <Button variant="destructive">
                        <Ban className="size-4" /> Cancel
                      </Button>
                    }
                    title="Cancel this notification?"
                    description="It will never be sent. This cannot be undone."
                    confirmLabel="Cancel notification"
                    destructive
                    onConfirm={async () => {
                      await cancelMutation.mutateAsync({ id: notification.id, input: { expectedVersion: notification.version } });
                    }}
                    getErrorMessage={notificationsErrorMessage}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </RequirePermission>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <OverviewField label="Channel" value={<Text variant="body" className="capitalize">{notification.channel}</Text>} />
              <OverviewField label="Recipient" value={<Text variant="body">{notification.recipient}</Text>} />
              <OverviewField label="Provider" value={<Text variant="body">{notification.providerCode ?? '—'}</Text>} />
              <OverviewField
                label="Related to"
                value={
                  <Text variant="body" className="capitalize">
                    {notification.relatedType ? `${notification.relatedType} ${notification.relatedId?.slice(0, 8) ?? ''}` : '—'}
                  </Text>
                }
              />
              <OverviewField label="Attempts" value={<Text variant="body">{notification.attemptsCount} / {notification.maxAttempts}</Text>} />
              <OverviewField label="Queued" value={<Text variant="body">{formatDateTime(notification.createdAt)}</Text>} />
              <OverviewField label="Last attempted" value={<Text variant="body">{formatDateTime(notification.lastAttemptedAt)}</Text>} />
              <OverviewField label="Next retry" value={<Text variant="body">{formatDateTime(notification.nextRetryAt)}</Text>} />
              {notification.sentAt && <OverviewField label="Sent" value={<Text variant="body">{formatDateTime(notification.sentAt)}</Text>} />}
              {notification.failedAt && <OverviewField label="Failed" value={<Text variant="body">{formatDateTime(notification.failedAt)}</Text>} />}
              {notification.cancelledAt && <OverviewField label="Cancelled" value={<Text variant="body">{formatDateTime(notification.cancelledAt)}</Text>} />}
              <OverviewField
                label="Notification ID"
                value={
                  <div className="flex items-center gap-1.5">
                    <Text variant="body" className="truncate font-mono text-caption">
                      {notification.id}
                    </Text>
                    <Button variant="ghost" size="sm" aria-label="Copy notification ID" onClick={() => void handleCopyId()}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <div className="flex items-center gap-2 text-text-secondary">
                <Mail className="size-4" aria-hidden="true" />
                <Text variant="body">No delivery attempts recorded yet.</Text>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {attempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-start gap-2.5">
                    <div className="mt-0.5 text-text-secondary">
                      {attempt.status === 'failed' ? <XCircle className="size-4" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Text variant="body-strong" className="capitalize">
                          {attempt.status}
                        </Text>
                        {attempt.providerCode && <Badge variant="default">{attempt.providerCode}</Badge>}
                      </div>
                      <Text variant="caption" className="text-text-secondary">
                        {formatDateTime(attempt.occurredAt)}
                        {attempt.providerReference ? ` · Ref ${attempt.providerReference}` : ''}
                      </Text>
                      {attempt.failureReason && (
                        <Text variant="caption" className="text-feedback-danger">
                          {attempt.failureReason}
                        </Text>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <RequirePermission anyOf={['notifications.audit_log.view']} inline={null}>
          <Button asChild variant="outline" className="w-fit">
            <Link to="/notifications/activity">
              <History className="size-4" /> View Notifications Activity
            </Link>
          </Button>
        </RequirePermission>
      </div>
    </div>
  );
}
