import { useState, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Copy, ClipboardList, PackageCheck, Truck, Home, AlertTriangle, Pencil, Plus, Trash2, StickyNote } from 'lucide-react';
import { Text, Badge, Button, Card, CardHeader, CardTitle, CardContent, Skeleton, ErrorState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, useToast } from '@nexgen/ui';
import type { ShipmentStatus } from '@nexgen/api-client';
import { ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { shippingErrorMessage } from '../shared/errors.js';
import { formatWeightGrams } from '../shared/formatWeight.js';
import { useShipment, useRemoveShipmentItem } from './queries.js';
import { useStaffDirectory } from '../activity/queries.js';
import { ShipmentStatusRail } from './ShipmentStatusRail.js';
import { ShipmentWorkflowActions } from './ShipmentWorkflowActions.js';
import { ShipmentReadinessChecklist } from './ShipmentReadinessChecklist.js';
import { ShipmentDestinationDialog } from './ShipmentDestinationDialog.js';
import { ShipmentItemFormDialog } from './ShipmentItemFormDialog.js';
import { ShipmentNoteFormDialog } from './ShipmentNoteFormDialog.js';

/** Statuses `SetShipmentDestinationAction` refuses to run against (`already_dispatched`) — confirmed by reading it directly. */
const DESTINATION_LOCKED_STATUSES: ShipmentStatus[] = ['dispatched', 'in_transit', 'delivered', 'failed', 'cancelled'];
/** Statuses `AddShipmentItemAction`/`RemoveShipmentItemAction` refuse to run against (`already_packed`) — confirmed by reading both directly. Notably `packing` (in progress) is NOT locked — only once genuinely `packed`. */
const ITEMS_LOCKED_STATUSES: ShipmentStatus[] = ['packed', 'dispatched', 'in_transit', 'delivered', 'failed', 'cancelled'];

const STATUS_VARIANT: Record<ShipmentStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'default',
  picking: 'warning',
  picked: 'warning',
  packing: 'warning',
  packed: 'warning',
  dispatched: 'info',
  in_transit: 'info',
  delivered: 'success',
  failed: 'danger',
  cancelled: 'danger',
};

const TIMELINE_ICON: Record<string, ReactNode> = {
  shipment_created: <ClipboardList className="size-4" aria-hidden="true" />,
  status_changed: <Truck className="size-4" aria-hidden="true" />,
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
 * Shipment detail — a dedicated route (`shipping/shipments/:id`), mirroring
 * Orders' own `OrderDetailPage` shape. `ShipmentController::show` is the
 * only endpoint that loads `items`/`timelineEvents`/`notes`
 * (`$shipment->load([...])`, confirmed by reading it directly) — this
 * page's one `useShipment(id)` query is the single source for every
 * section below.
 *
 * Slice 2 (`planning/reviews/PHASE_2_8_SLICE_2_FULFILLMENT_WORKFLOW_REPORT.md`)
 * added the real Pick/Pack/Dispatch/In-Transit/Deliver/Fail/Cancel workflow
 * action bar (`ShipmentWorkflowActions`) and the status progression rail
 * (`ShipmentStatusRail`). Slice 3 ("Shipment Preparation") closes the gap
 * Slice 2 left open — Destination+Weight editing (`ShipmentDestinationDialog`),
 * Item add/remove (`ShipmentItemFormDialog` + inline row delete), and Note
 * composition (`ShipmentNoteFormDialog`), plus a persistent readiness
 * checklist (`ShipmentReadinessChecklist`) surfacing the same three real
 * backend preconditions the action bar itself gates on. All four write
 * paths sit behind the single real `fulfillment.shipments.manage`
 * permission (confirmed via `Authorization\PermissionRegistry.php`),
 * distinct from the four workflow permissions Slice 2 introduced.
 *
 * **No "Warehouse" section** — `Shipment` has no warehouse field at all
 * (confirmed via the model's own docblock); see `ShipmentsListPage`'s own
 * docblock and the Slice 1 completion report for the full rationale.
 *
 * **"Audit" link** goes to the module-wide Fulfillment Activity page, not a
 * per-shipment filtered view — `AuditLogController::index` (Fulfillment's
 * own) supports no `target_id` filter (confirmed by reading it directly,
 * the identical constraint every other module's own audit endpoint has),
 * so this Shipment's own Timeline (below) is the real per-shipment activity
 * record; the Audit link is for the module-wide, unfiltered log.
 */
export function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: shipment, status: queryStatus, refetch } = useShipment(id);
  const removeItemMutation = useRemoveShipmentItem();
  const { data: staff } = useStaffDirectory();
  const staffNameById = new Map((staff ?? []).map((u) => [u.id, u.name]));

  const [destinationOpen, setDestinationOpen] = useState(false);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [noteFormOpen, setNoteFormOpen] = useState(false);

  async function handleCopyId(): Promise<void> {
    if (!shipment) return;
    await navigator.clipboard.writeText(shipment.id);
    toast({ variant: 'success', title: 'Shipment ID copied' });
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

  if (queryStatus === 'error' || !shipment) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const items = shipment.items ?? [];
  const notes = shipment.notes ?? [];
  const timeline = shipment.timeline ?? [];
  const hasDestination = Boolean(shipment.destination.recipientName && shipment.destination.phone && shipment.destination.addressLine1 && shipment.destination.city && shipment.destination.countryCode);
  const destinationLocked = DESTINATION_LOCKED_STATUSES.includes(shipment.status);
  const itemsLocked = ITEMS_LOCKED_STATUSES.includes(shipment.status);

  return (
    <div>
      <button
        type="button"
        onClick={() => void navigate('/shipping/shipments')}
        className="mb-3 inline-flex items-center gap-1 text-label text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Shipments
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Text as="h1" variant="heading" className="font-mono">
              Shipment {shipment.id.slice(0, 8)}
            </Text>
            <Badge variant={STATUS_VARIANT[shipment.status]}>{shipment.status.replace('_', ' ')}</Badge>
          </div>
          <Text variant="body" className="mt-1 text-text-secondary">
            Order {shipment.orderNumber}
          </Text>
        </div>
        <RequirePermission anyOf={['fulfillment.audit_log.view']} inline={null}>
          <Button asChild variant="outline">
            <Link to="/shipping/fulfillment-activity">
              <ClipboardList className="size-4" /> Audit
            </Link>
          </Button>
        </RequirePermission>
      </div>

      <div className="flex flex-col gap-4">
        {shipment.status === 'failed' && shipment.failureReason && (
          <Card className="border-feedback-danger/40">
            <CardContent className="flex items-start gap-2.5 pt-4">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-feedback-danger" aria-hidden="true" />
              <div>
                <Text variant="body-strong">Fulfillment failed</Text>
                <Text variant="body" className="text-text-secondary">
                  {shipment.failureReason}
                </Text>
              </div>
            </CardContent>
          </Card>
        )}

        {shipment.status === 'cancelled' && (
          <Card className="border-feedback-danger/40">
            <CardContent className="flex items-start gap-2.5 pt-4">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-feedback-danger" aria-hidden="true" />
              <div>
                <Text variant="body-strong">Shipment cancelled</Text>
                {shipment.failureReason && (
                  <Text variant="body" className="text-text-secondary">
                    {shipment.failureReason}
                  </Text>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <ShipmentStatusRail shipment={shipment} />
            <div className="border-t border-border pt-4">
              <ShipmentReadinessChecklist shipment={shipment} />
            </div>
            <RequirePermission
              anyOf={['fulfillment.shipments.pick', 'fulfillment.shipments.pack', 'fulfillment.shipments.dispatch', 'fulfillment.shipments.cancel']}
              inline={null}
            >
              <div className="border-t border-border pt-4">
                <ShipmentWorkflowActions shipment={shipment} />
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
                    <Text variant="body">{shipment.orderNumber}</Text>
                    {/* `Shipment.orderId` is identifier-only, never a live foreign key (confirmed via the shipments migration's own docblock) — this link can 404 if the order was since deleted, an accepted, honest edge case. */}
                    <RequirePermission anyOf={['orders.orders.view']} inline={null}>
                      <Button asChild variant="ghost" size="sm" aria-label={`View order ${shipment.orderNumber}`}>
                        <Link to={`/orders/${shipment.orderId}`}>
                          <PackageCheck className="size-3.5" />
                        </Link>
                      </Button>
                    </RequirePermission>
                  </div>
                }
              />
              <OverviewField label="Customer ID" value={<span className="font-mono text-caption">{shipment.customerId}</span>} />
              <OverviewField label="Grand total" value={<Text variant="body">{shipment.grandTotal ? `${shipment.grandTotal} ${shipment.currencyCode ?? ''}` : '—'}</Text>} />
              <OverviewField label="Weight" value={<Text variant="body">{formatWeightGrams(shipment.weightGrams)}</Text>} />
              <OverviewField label="Created" value={<Text variant="body">{formatDateTime(shipment.createdAt)}</Text>} />
              <OverviewField label="Updated" value={<Text variant="body">{formatDateTime(shipment.updatedAt)}</Text>} />
              <OverviewField
                label="Shipment ID"
                value={
                  <div className="flex items-center gap-1.5">
                    <Text variant="body" className="truncate font-mono text-caption">
                      {shipment.id}
                    </Text>
                    <Button variant="ghost" size="sm" aria-label="Copy shipment ID" onClick={() => void handleCopyId()}>
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
            <CardTitle>Courier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <OverviewField
                label="Provider"
                value={
                  <Text variant="body">
                    {shipment.courierProviderCode ?? (shipment.dispatchedAt ? 'Self-fulfilled' : 'Not yet dispatched')}
                  </Text>
                }
              />
              <OverviewField label="Consignment ID" value={<Text variant="body" className="font-mono text-caption">{shipment.courierConsignmentId ?? '—'}</Text>} />
              <OverviewField label="Tracking number" value={<Text variant="body" className="font-mono text-caption">{shipment.trackingNumber ?? '—'}</Text>} />
              {shipment.labelUrl && (
                <OverviewField
                  label="Label"
                  value={
                    <a href={shipment.labelUrl} target="_blank" rel="noreferrer" className="text-body text-brand hover:underline">
                      View label
                    </a>
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Destination address</CardTitle>
            <RequirePermission anyOf={['fulfillment.shipments.manage']} inline={null}>
              {!destinationLocked && (
                <Button size="sm" variant="outline" onClick={() => setDestinationOpen(true)}>
                  <Pencil className="size-4" /> {hasDestination ? 'Edit' : 'Set destination'}
                </Button>
              )}
            </RequirePermission>
          </CardHeader>
          <CardContent>
            {hasDestination ? (
              <div className="flex flex-col gap-1">
                <Text variant="body-strong">{shipment.destination.recipientName}</Text>
                <Text variant="body" className="text-text-secondary">
                  {[shipment.destination.addressLine1, shipment.destination.addressLine2, [shipment.destination.city, shipment.destination.region].filter(Boolean).join(', '), shipment.destination.postalCode, shipment.destination.countryCode]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
                {shipment.destination.phone && (
                  <Text variant="caption" className="text-text-secondary">
                    {shipment.destination.phone}
                  </Text>
                )}
              </div>
            ) : (
              <Text variant="body" className="text-text-secondary">
                No destination address set yet.
              </Text>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Items</CardTitle>
            <RequirePermission anyOf={['fulfillment.shipments.manage']} inline={null}>
              {!itemsLocked && (
                <Button size="sm" onClick={() => setItemFormOpen(true)}>
                  <Plus className="size-4" /> Add item
                </Button>
              )}
            </RequirePermission>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <Text variant="body" className="text-text-secondary">
                No items on this shipment yet.
              </Text>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-caption">{item.sku}</TableCell>
                      <TableCell>{item.description ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                      <TableCell>
                        <RequirePermission anyOf={['fulfillment.shipments.manage']} inline={null}>
                          {!itemsLocked && (
                            <ConfirmDialog
                              trigger={
                                <Button variant="ghost" size="sm" aria-label={`Remove ${item.sku}`}>
                                  <Trash2 className="size-4" />
                                </Button>
                              }
                              title="Remove this item?"
                              description={`"${item.sku}" will be removed from this shipment. This cannot be undone.`}
                              confirmLabel="Remove"
                              destructive
                              onConfirm={() => removeItemMutation.mutateAsync({ id: shipment.id, itemId: item.id })}
                              getErrorMessage={shippingErrorMessage}
                            />
                          )}
                        </RequirePermission>
                      </TableCell>
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
            <RequirePermission anyOf={['fulfillment.shipments.manage']} inline={null}>
              <Button size="sm" onClick={() => setNoteFormOpen(true)}>
                <Plus className="size-4" /> Add note
              </Button>
            </RequirePermission>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <Text variant="body" className="text-text-secondary">
                No notes on this shipment yet.
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
                      {TIMELINE_ICON[event.eventType] ?? <Home className="size-4" aria-hidden="true" />}
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

      <ShipmentDestinationDialog open={destinationOpen} onOpenChange={setDestinationOpen} shipment={shipment} />
      <ShipmentItemFormDialog open={itemFormOpen} onOpenChange={setItemFormOpen} shipment={shipment} />
      <ShipmentNoteFormDialog open={noteFormOpen} onOpenChange={setNoteFormOpen} shipment={shipment} />
    </div>
  );
}
