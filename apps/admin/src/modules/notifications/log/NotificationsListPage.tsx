import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCw, Ban, Mail } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, Select } from '@nexgen/ui';
import type { NotificationDTO, NotificationStatus } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { notificationsErrorMessage } from '../shared/errors.js';
import { useNotifications, useRetryNotification, useCancelNotification } from '../shared/queries.js';

type StatusFilter = 'all' | NotificationStatus;
type ChannelFilter = string;

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
 * Notifications — `notifications.notifications.view`, the real Delivery
 * Log every automated customer notification lands in. `NotificationController::
 * index` genuinely supports server-side `status`/`channel` (confirmed by
 * reading it directly; `related_type`/`related_id` are a pair this list
 * doesn't filter by — that's Order/Payment/Shipment Detail's own
 * cross-link, not a top-level filter a merchant would type in), hardcoded
 * `orderByDesc('created_at')`, Laravel's own default pagination.
 *
 * Retry/Cancel are offered inline (`notifications.notifications.manage`)
 * for the two real statuses where each is actually meaningful: Retry only
 * for `failed` (mirrors `RetryNotificationAction`'s own real precondition,
 * confirmed by reading it directly), Cancel only for `pending`/`queued`.
 */
export function NotificationsListPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [status, channel]);

  const { data, status: queryStatus, refetch } = useNotifications({
    status: status === 'all' ? undefined : status,
    channel: channel === 'all' ? undefined : channel,
    page,
  });
  const notifications = useMemo(() => data?.data ?? [], [data]);

  const retryMutation = useRetryNotification();
  const cancelMutation = useCancelNotification();

  const columns: DataTableColumn<NotificationDTO>[] = [
    { id: 'channel', header: 'Channel', cell: (row) => <span className="capitalize">{row.channel}</span> },
    { id: 'recipient', header: 'Recipient', cell: (row) => row.recipient },
    { id: 'subject', header: 'Subject', cell: (row) => row.subject ?? '—' },
    { id: 'status', header: 'Status', cell: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge> },
    { id: 'related', header: 'Related to', cell: (row) => (row.relatedType ? <span className="capitalize text-text-secondary">{row.relatedType}</span> : '—') },
    { id: 'created', header: 'Queued', cell: (row) => formatDateTime(row.createdAt) },
    {
      id: 'actions',
      header: '',
      className: 'w-20',
      cell: (row) => (
        <RequirePermission anyOf={['notifications.notifications.manage']} inline={null}>
          <div className="flex items-center gap-1">
            {row.status === 'failed' && (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Retry"
                onClick={(e) => {
                  e.stopPropagation();
                  void retryMutation.mutateAsync({ id: row.id });
                }}
              >
                <RotateCw className="size-4" />
              </Button>
            )}
            {(row.status === 'pending' || row.status === 'queued') && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm" aria-label="Cancel" onClick={(e) => e.stopPropagation()}>
                    <Ban className="size-4" />
                  </Button>
                }
                title="Cancel this notification?"
                description="It will never be sent. This cannot be undone."
                confirmLabel="Cancel notification"
                destructive
                onConfirm={async () => {
                  await cancelMutation.mutateAsync({ id: row.id, input: { expectedVersion: row.version } });
                }}
                getErrorMessage={notificationsErrorMessage}
              />
            )}
          </div>
        </RequirePermission>
      ),
    },
  ];

  return (
    <CrudPageLayout
      header={{ title: 'Notifications', description: 'Every real notification queued for a customer — delivery status, retries, and failures.' }}
      toolbar={
        <Toolbar
          filters={
            <FilterBar
              active={[
                ...(status === 'all' ? [] : [{ key: 'status', label: 'Status', displayValue: status }]),
                ...(channel === 'all' ? [] : [{ key: 'channel', label: 'Channel', displayValue: channel }]),
              ]}
              onRemove={(key) => {
                if (key === 'status') setStatus('all');
                if (key === 'channel') setChannel('all');
              }}
              onClearAll={() => {
                setStatus('all');
                setChannel('all');
              }}
            >
              <div className="flex flex-col gap-3">
                <Select
                  label="Status"
                  value={status}
                  onValueChange={(v) => setStatus(v as StatusFilter)}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'queued', label: 'Queued' },
                    { value: 'sending', label: 'Sending' },
                    { value: 'sent', label: 'Sent' },
                    { value: 'failed', label: 'Failed' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
                <Select
                  label="Channel"
                  value={channel}
                  onValueChange={setChannel}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'email', label: 'Email' },
                    { value: 'sms', label: 'SMS' },
                    { value: 'whatsapp', label: 'WhatsApp' },
                    { value: 'in_app', label: 'In-app' },
                  ]}
                />
              </div>
            </FilterBar>
          }
        />
      }
      pagination={data?.meta?.last_page ? { currentPage: data.meta.current_page ?? page, totalPages: data.meta.last_page, onPageChange: setPage } : undefined}
    >
      <DataTable
        columns={columns}
        data={notifications}
        getRowId={(row) => row.id}
        onRowClick={(row) => void navigate(`/notifications/log/${row.id}`)}
        status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
        onRetry={() => void refetch()}
        emptyState={
          status !== 'all' || channel !== 'all'
            ? { icon: <Mail className="size-8" aria-hidden="true" />, title: 'No matching notifications', description: 'No notifications match the current filter.' }
            : { icon: <Mail className="size-8" aria-hidden="true" />, title: 'No notifications yet', description: 'A notification appears here the moment one is queued for a customer.' }
        }
      />
    </CrudPageLayout>
  );
}
