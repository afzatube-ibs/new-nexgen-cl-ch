import { useState, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Copy, ClipboardList, AlertTriangle, Plus, StickyNote, Package } from 'lucide-react';
import { Text, Badge, Button, Card, CardHeader, CardTitle, CardContent, Skeleton, ErrorState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, useToast } from '@nexgen/ui';
import type { ReturnRequestStatus } from '@nexgen/api-client';
import { RequirePermission } from '../../../framework/index.js';
import { useReturnRequest } from '../shared/queries.js';
import { useStaffDirectory } from '../activity/queries.js';
import { ReturnStatusRail } from './ReturnStatusRail.js';
import { ReturnWorkflowActions } from './ReturnWorkflowActions.js';
import { ReturnRefundExchangePanel } from './ReturnRefundExchangePanel.js';
import { ReturnNoteFormDialog } from './ReturnNoteFormDialog.js';

const STATUS_VARIANT: Record<ReturnRequestStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  requested: 'default',
  approved: 'info',
  pickup_scheduled: 'info',
  received: 'warning',
  inspecting: 'warning',
  resolution_approved: 'info',
  completed: 'success',
  rejected: 'danger',
  cancelled: 'danger',
};

const REASON_LABEL: Record<string, string> = {
  damaged: 'Damaged',
  wrong_item: 'Wrong item',
  courier_damage: 'Courier damage',
  delivery_refused: 'Delivery refused',
  changed_mind: 'Changed mind',
  other: 'Other',
};

const TIMELINE_ICON: Record<string, ReactNode> = {
  return_request_created: <ClipboardList className="size-4" aria-hidden="true" />,
  status_changed: <Package className="size-4" aria-hidden="true" />,
  note_added: <StickyNote className="size-4" aria-hidden="true" />,
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
 * Return request detail — a dedicated route (`returns/requests/:id`),
 * mirroring `ShipmentDetailPage`'s own composition shape exactly.
 * `ReturnRequestController::show` eager-loads `items`/`timelineEvents`/
 * `notes`/`refundRequest`/`exchangeRequest` all at once (confirmed by
 * reading it directly — no `whenLoaded()` gap here, unlike two real bugs
 * found and fixed in Milestone 6's own Identity & Access endpoints); this
 * page's one `useReturnRequest(id)` query is the single source for every
 * section below.
 *
 * **No editable Items card** — unlike Shipment's own Items card, Returns has
 * no `POST/DELETE .../items` endpoint at all (confirmed via `routes.php`
 * directly): every item is fixed at creation time
 * (`CreateReturnRequestRequest`'s own required array), so this page shows
 * them read-only.
 *
 * **"Audit" link** goes to the module-wide Returns Activity page, not a
 * per-request filtered view — `AuditLogController::index` (Returns' own)
 * supports no `target_id` filter (confirmed by reading it directly, the
 * identical constraint every other module's own audit endpoint has), so
 * this return's own Timeline (below) is the real per-request activity
 * record; the Audit link is for the module-wide, unfiltered log.
 */
export function ReturnRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: returnRequest, status: queryStatus, refetch } = useReturnRequest(id);
  const { data: staff } = useStaffDirectory();
  const staffNameById = new Map((staff ?? []).map((u) => [u.id, u.name]));

  const [noteFormOpen, setNoteFormOpen] = useState(false);

  async function handleCopyId(): Promise<void> {
    if (!returnRequest) return;
    await navigator.clipboard.writeText(returnRequest.id);
    toast({ variant: 'success', title: 'Return request ID copied' });
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

  if (queryStatus === 'error' || !returnRequest) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const items = returnRequest.items ?? [];
  const notes = returnRequest.notes ?? [];
  const timeline = returnRequest.timeline ?? [];

  return (
    <div>
      <button
        type="button"
        onClick={() => void navigate('/returns/requests')}
        className="mb-3 inline-flex items-center gap-1 text-label text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Returns
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Text as="h1" variant="heading" className="font-mono">
              {returnRequest.rmaNumber}
            </Text>
            <Badge variant={STATUS_VARIANT[returnRequest.status]}>{returnRequest.status.replace(/_/g, ' ')}</Badge>
          </div>
          <Text variant="body" className="mt-1 text-text-secondary">
            {returnRequest.type === 'exchange' ? 'Exchange request' : 'Return request'} · {REASON_LABEL[returnRequest.reason] ?? returnRequest.reason}
          </Text>
        </div>
        <RequirePermission anyOf={['returns.audit_log.view']} inline={null}>
          <Button asChild variant="outline">
            <Link to="/returns/activity">
              <ClipboardList className="size-4" /> Audit
            </Link>
          </Button>
        </RequirePermission>
      </div>

      <div className="flex flex-col gap-4">
        {returnRequest.status === 'rejected' && (
          <Card className="border-feedback-danger/40">
            <CardContent className="flex items-start gap-2.5 pt-4">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-feedback-danger" aria-hidden="true" />
              <div>
                <Text variant="body-strong">Return request rejected</Text>
                {returnRequest.rejectionReason && (
                  <Text variant="body" className="text-text-secondary">
                    {returnRequest.rejectionReason}
                  </Text>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {returnRequest.status === 'cancelled' && (
          <Card className="border-feedback-danger/40">
            <CardContent className="flex items-start gap-2.5 pt-4">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-feedback-danger" aria-hidden="true" />
              <Text variant="body-strong">Return request cancelled</Text>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <ReturnStatusRail returnRequest={returnRequest} />
            <RequirePermission
              anyOf={['returns.requests.approve', 'returns.requests.manage', 'returns.requests.inspect', 'returns.requests.resolve', 'returns.requests.cancel']}
              inline={null}
            >
              <div className="border-t border-border pt-4">
                <ReturnWorkflowActions returnRequest={returnRequest} />
              </div>
            </RequirePermission>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <OverviewField
                label="Order"
                value={
                  <div className="flex items-center gap-1.5">
                    <RequirePermission anyOf={['orders.orders.view']} inline={<span className="font-mono text-caption">{returnRequest.orderId.slice(0, 8)}</span>}>
                      <Link to={`/orders/${returnRequest.orderId}`} className="text-body text-brand hover:underline">
                        {returnRequest.orderId.slice(0, 8)}
                      </Link>
                    </RequirePermission>
                  </div>
                }
              />
              <OverviewField label="Customer ID" value={<span className="font-mono text-caption">{returnRequest.customerId}</span>} />
              <OverviewField label="Reason" value={<Text variant="body">{REASON_LABEL[returnRequest.reason] ?? returnRequest.reason}</Text>} />
              {returnRequest.reasonDetails && <OverviewField label="Reason details" value={<Text variant="body">{returnRequest.reasonDetails}</Text>} />}
              <OverviewField label="Created" value={<Text variant="body">{formatDateTime(returnRequest.createdAt)}</Text>} />
              <OverviewField label="Updated" value={<Text variant="body">{formatDateTime(returnRequest.updatedAt)}</Text>} />
              <OverviewField
                label="Return request ID"
                value={
                  <div className="flex items-center gap-1.5">
                    <Text variant="body" className="truncate font-mono text-caption">
                      {returnRequest.id}
                    </Text>
                    <Button variant="ghost" size="sm" aria-label="Copy return request ID" onClick={() => void handleCopyId()}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                }
              />
            </div>
          </CardContent>
        </Card>

        {(returnRequest.pickup.providerCode || returnRequest.pickup.trackingNumber || returnRequest.pickup.scheduledAt) && (
          <Card>
            <CardHeader>
              <CardTitle>Pickup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <OverviewField label="Provider" value={<Text variant="body">{returnRequest.pickup.providerCode ?? '—'}</Text>} />
                <OverviewField label="Tracking number" value={<Text variant="body" className="font-mono text-caption">{returnRequest.pickup.trackingNumber ?? '—'}</Text>} />
                <OverviewField label="Scheduled" value={<Text variant="body">{formatDateTime(returnRequest.pickup.scheduledAt)}</Text>} />
              </div>
            </CardContent>
          </Card>
        )}

        <ReturnRefundExchangePanel returnRequest={returnRequest} />

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <Text variant="body" className="text-text-secondary">
                No items recorded on this return request.
              </Text>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-caption">{item.sku}</TableCell>
                      <TableCell>{item.description ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Notes</CardTitle>
            <RequirePermission anyOf={['returns.requests.manage']} inline={null}>
              <Button size="sm" onClick={() => setNoteFormOpen(true)}>
                <Plus className="size-4" /> Add note
              </Button>
            </RequirePermission>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <Text variant="body" className="text-text-secondary">
                No notes on this return request yet.
              </Text>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {notes.map((note) => (
                  <div key={note.id} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-1.5">
                      <Text variant="caption" className="text-text-secondary">
                        {note.authorId ? (staffNameById.get(note.authorId) ?? note.authorId.slice(0, 8)) : 'System'} · {formatDateTime(note.createdAt)}
                      </Text>
                      {note.isCustomerVisible && <Badge variant="info">Customer-visible</Badge>}
                    </div>
                    <Text variant="body">{note.body}</Text>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <Text variant="body" className="text-text-secondary">
                No timeline events yet.
              </Text>
            ) : (
              <div className="flex flex-col gap-3">
                {timeline.map((event) => (
                  <div key={event.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-text-secondary">
                      {TIMELINE_ICON[event.eventType] ?? <Package className="size-4" aria-hidden="true" />}
                    </span>
                    <div>
                      <Text variant="body">{event.description}</Text>
                      <Text variant="caption" className="text-text-secondary">
                        {formatDateTime(event.occurredAt)}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ReturnNoteFormDialog open={noteFormOpen} onOpenChange={setNoteFormOpen} returnRequest={returnRequest} />
    </div>
  );
}
