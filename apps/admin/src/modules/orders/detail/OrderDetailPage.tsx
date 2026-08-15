import { useMemo, useState, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Copy, Plus, CheckCircle2, PackageCheck, Truck, Home, XCircle, UserRound } from 'lucide-react';
import {
  Text,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
  ErrorState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  useToast,
} from '@nexgen/ui';
import { ORDER_TRANSITIONS, type OrderStatus, type OrderTimelineEventType } from '@nexgen/api-client';
import { ConfirmDialog, RequirePermission } from '../../../framework/index.js';
import { ordersErrorMessage } from '../shared/errors.js';
import { formatCurrency } from '../shared/formatCurrency.js';
import { useOrder, useConfirmOrder, useStartProcessingOrder, useShipOrder, useDeliverOrder, useStaffDirectory } from '../shared/queries.js';
import { OrderCancelDialog } from './OrderCancelDialog.js';
import { OrderNoteFormDialog } from './OrderNoteFormDialog.js';
import { OrderFulfillmentCard } from './OrderFulfillmentCard.js';
import { OrderPaymentsCard } from './OrderPaymentsCard.js';
import { OrderNotificationsCard } from './OrderNotificationsCard.js';

const STATUS_VARIANT: Record<OrderStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'default',
  confirmed: 'info',
  processing: 'warning',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

const TIMELINE_ICON: Record<OrderTimelineEventType, ReactNode> = {
  order_placed: <PackageCheck className="size-4" aria-hidden="true" />,
  status_changed: <Truck className="size-4" aria-hidden="true" />,
  note_added: <Plus className="size-4" aria-hidden="true" />,
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

function formatOrderAddress(address: { recipientName: string; phone: string | null; addressLine1: string; addressLine2: string | null; city: string; region: string | null; postalCode: string | null; countryCode: string }): string {
  return [address.addressLine1, address.addressLine2, [address.city, address.region].filter(Boolean).join(', '), address.postalCode, address.countryCode]
    .filter(Boolean)
    .join(', ');
}

/**
 * Order detail — a dedicated route (`orders/:id`), mirroring Customers' own
 * shape. `OrderController::show` is the only endpoint that loads
 * `items`/`addresses`/`discounts`/`notes`/`timelineEvents`
 * (`$order->load([...])`, confirmed by reading it directly) — this page's
 * one `useOrder(id)` query is the single source for every section below.
 *
 * READ + LIFECYCLE MANAGEMENT ONLY, per this slice's own brief: no order-
 * creation, refund, return, carrier-management, payment-capture, or
 * invoice capability is built here. Slice 2 adds real, read-only visibility
 * into three genuinely existing cross-domain relationships (Fulfillment's
 * Shipment, Payments' Payment, Notifications' order-confirmation email) —
 * see `OrderFulfillmentCard`/`OrderPaymentsCard`/`OrderNotificationsCard`'s
 * own docblocks for exactly which real backend endpoint each consumes.
 */
export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: order, status: queryStatus, refetch } = useOrder(id);
  const { data: staff } = useStaffDirectory();
  const staffNameById = useMemo(() => new Map((staff ?? []).map((u) => [u.id, u.name])), [staff]);

  const confirmMutation = useConfirmOrder();
  const startProcessingMutation = useStartProcessingOrder();
  const shipMutation = useShipOrder();
  const deliverMutation = useDeliverOrder();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [noteFormOpen, setNoteFormOpen] = useState(false);

  async function handleCopyId(): Promise<void> {
    if (!order) return;
    await navigator.clipboard.writeText(order.id);
    toast({ variant: 'success', title: 'Order ID copied' });
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

  if (queryStatus === 'error' || !order) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const items = order.items ?? [];
  const addresses = order.addresses ?? [];
  const billingAddress = addresses.find((a) => a.addressType === 'billing');
  const shippingAddress = addresses.find((a) => a.addressType === 'shipping');
  const discounts = order.discounts ?? [];
  const notes = order.notes ?? [];
  const timelineEvents = order.timelineEvents ?? [];

  const nextStatuses = ORDER_TRANSITIONS[order.status];

  return (
    <div>
      <button
        type="button"
        onClick={() => void navigate('/orders')}
        className="mb-3 inline-flex items-center gap-1 text-label text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Orders
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Text as="h1" variant="heading" className="tabular-nums">
              {order.orderNumber}
            </Text>
            <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
          </div>
          <Text variant="body" className="mt-1 text-text-secondary">
            {order.customerName} · {order.customerEmail}
          </Text>
        </div>
        <RequirePermission anyOf={['orders.orders.manage']} inline={null}>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {nextStatuses.includes('confirmed') && (
              <ConfirmDialog
                trigger={
                  <Button variant="outline">
                    <CheckCircle2 className="size-4" /> Confirm
                  </Button>
                }
                title={`Confirm order ${order.orderNumber}?`}
                description="This order will move to Confirmed."
                confirmLabel="Confirm order"
                onConfirm={async () => {
                  await confirmMutation.mutateAsync({ id: order.id, input: { expectedVersion: order.version } });
                }}
                getErrorMessage={ordersErrorMessage}
              />
            )}
            {nextStatuses.includes('processing') && (
              <ConfirmDialog
                trigger={
                  <Button variant="outline">
                    <PackageCheck className="size-4" /> Start processing
                  </Button>
                }
                title={`Start processing order ${order.orderNumber}?`}
                description="This order will move to Processing."
                confirmLabel="Start processing order"
                onConfirm={async () => {
                  await startProcessingMutation.mutateAsync({ id: order.id, input: { expectedVersion: order.version } });
                }}
                getErrorMessage={ordersErrorMessage}
              />
            )}
            {nextStatuses.includes('shipped') && (
              <ConfirmDialog
                trigger={
                  <Button variant="outline">
                    <Truck className="size-4" /> Ship
                  </Button>
                }
                title={`Mark order ${order.orderNumber} as shipped?`}
                description="This order will move to Shipped."
                confirmLabel="Mark as shipped"
                onConfirm={async () => {
                  await shipMutation.mutateAsync({ id: order.id, input: { expectedVersion: order.version } });
                }}
                getErrorMessage={ordersErrorMessage}
              />
            )}
            {nextStatuses.includes('delivered') && (
              <ConfirmDialog
                trigger={
                  <Button variant="outline">
                    <Home className="size-4" /> Deliver
                  </Button>
                }
                title={`Mark order ${order.orderNumber} as delivered?`}
                description="This order will move to Delivered, a final state."
                confirmLabel="Mark as delivered"
                onConfirm={async () => {
                  await deliverMutation.mutateAsync({ id: order.id, input: { expectedVersion: order.version } });
                }}
                getErrorMessage={ordersErrorMessage}
              />
            )}
            {nextStatuses.includes('cancelled') && (
              <Button variant="outline" className="text-feedback-danger hover:text-feedback-danger" onClick={() => setCancelOpen(true)}>
                <XCircle className="size-4" /> Cancel
              </Button>
            )}
          </div>
        </RequirePermission>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <OverviewField
                label="Customer"
                value={
                  <div className="flex items-center gap-1.5">
                    <Text variant="body">{order.customerName}</Text>
                    {/* `Order.customerId` is identifier-only, never a live foreign key (confirmed via the orders migration's own docblock) — this link can 404 if the customer was since deleted, an accepted, honest edge case rather than a reason to hide a real, working link for the overwhelming majority of orders. */}
                    <RequirePermission anyOf={['customers.customers.view']} inline={null}>
                      <Button asChild variant="ghost" size="sm" aria-label={`View customer ${order.customerName}`}>
                        <Link to={`/customers/${order.customerId}`}>
                          <UserRound className="size-3.5" />
                        </Link>
                      </Button>
                    </RequirePermission>
                  </div>
                }
              />
              <OverviewField label="Email" value={<Text variant="body">{order.customerEmail}</Text>} />
              <OverviewField label="Phone" value={<Text variant="body">{order.customerPhone ?? '—'}</Text>} />
              <OverviewField label="Currency" value={<Text variant="body">{order.currencyCode}</Text>} />
              <OverviewField label="Placed" value={<Text variant="body">{formatDateTime(order.placedAt)}</Text>} />
              <OverviewField label="Updated" value={<Text variant="body">{formatDateTime(order.updatedAt)}</Text>} />
              <OverviewField
                label="Order ID"
                value={
                  <div className="flex items-center gap-1.5">
                    <Text variant="body" className="truncate font-mono text-caption">
                      {order.id}
                    </Text>
                    <Button variant="ghost" size="sm" aria-label="Copy order ID" onClick={() => void handleCopyId()}>
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
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Line subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="font-mono text-caption">{item.sku}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(item.unitPrice, order.currencyCode)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(item.discountAmount, order.currencyCode)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(item.taxAmount, order.currencyCode)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(item.lineSubtotal, order.currencyCode)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Billing address</CardTitle>
            </CardHeader>
            <CardContent>
              {billingAddress ? (
                <div className="flex flex-col gap-1">
                  <Text variant="body-strong">{billingAddress.recipientName}</Text>
                  <Text variant="body" className="text-text-secondary">
                    {formatOrderAddress(billingAddress)}
                  </Text>
                  {billingAddress.phone && (
                    <Text variant="caption" className="text-text-secondary">
                      {billingAddress.phone}
                    </Text>
                  )}
                </div>
              ) : (
                <Text variant="body" className="text-text-secondary">
                  No billing address on record.
                </Text>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Shipping address</CardTitle>
            </CardHeader>
            <CardContent>
              {shippingAddress ? (
                <div className="flex flex-col gap-1">
                  <Text variant="body-strong">{shippingAddress.recipientName}</Text>
                  <Text variant="body" className="text-text-secondary">
                    {formatOrderAddress(shippingAddress)}
                  </Text>
                  {shippingAddress.phone && (
                    <Text variant="caption" className="text-text-secondary">
                      {shippingAddress.phone}
                    </Text>
                  )}
                </div>
              ) : (
                <Text variant="body" className="text-text-secondary">
                  No shipping address on record.
                </Text>
              )}
            </CardContent>
          </Card>
        </div>

        {discounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Discounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col divide-y divide-border">
                {discounts.map((discount) => (
                  <div key={discount.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <div>
                      <Text variant="body">{discount.label}</Text>
                      {discount.code && (
                        <Text variant="caption" className="text-text-secondary">
                          Code: {discount.code}
                        </Text>
                      )}
                    </div>
                    <Text variant="body-strong" className="tabular-nums">
                      −{formatCurrency(discount.amount, order.currencyCode)}
                    </Text>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <dt className="text-body text-text-secondary">Subtotal</dt>
                <dd className="tabular-nums">{formatCurrency(order.subtotal, order.currencyCode)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-body text-text-secondary">Discount</dt>
                <dd className="tabular-nums">−{formatCurrency(order.discountTotal, order.currencyCode)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-body text-text-secondary">Tax</dt>
                <dd className="tabular-nums">{formatCurrency(order.taxTotal, order.currencyCode)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-body text-text-secondary">Shipping</dt>
                <dd className="tabular-nums">{formatCurrency(order.shippingTotal, order.currencyCode)}</dd>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5">
                <dt className="text-body-strong">Grand total</dt>
                <dd className="text-body-strong tabular-nums">{formatCurrency(order.grandTotal, order.currencyCode)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <RequirePermission anyOf={['fulfillment.shipments.view']} inline={null}>
          <OrderFulfillmentCard orderId={order.id} />
        </RequirePermission>

        <RequirePermission anyOf={['payments.payments.view']} inline={null}>
          <OrderPaymentsCard orderId={order.id} />
        </RequirePermission>

        <RequirePermission anyOf={['notifications.notifications.view']} inline={null}>
          <OrderNotificationsCard orderId={order.id} />
        </RequirePermission>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Notes</CardTitle>
            <RequirePermission anyOf={['orders.notes.manage']} inline={null}>
              <Button size="sm" onClick={() => setNoteFormOpen(true)}>
                <Plus className="size-4" /> Add note
              </Button>
            </RequirePermission>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <Text variant="body" className="text-text-secondary">
                No notes on this order yet.
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
            {timelineEvents.length === 0 ? (
              <Text variant="body" className="text-text-secondary">
                No timeline events yet.
              </Text>
            ) : (
              <div className="flex flex-col gap-3">
                {timelineEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-text-secondary">
                      {TIMELINE_ICON[event.eventType]}
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

      <OrderCancelDialog open={cancelOpen} onOpenChange={setCancelOpen} order={order} />
      <OrderNoteFormDialog open={noteFormOpen} onOpenChange={setNoteFormOpen} order={order} />
    </div>
  );
}
