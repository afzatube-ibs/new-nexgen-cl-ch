import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, PackageSearch } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, Select, Text } from '@nexgen/ui';
import type { ShipmentDTO, ShipmentStatus } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, RequirePermission } from '../../../framework/index.js';
import { useShipments } from './queries.js';

type StatusFilter = 'all' | ShipmentStatus;

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

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

/**
 * Shipments — `fulfillment.shipments.view`. Read-only, per Slice 1's own
 * "configuration + visibility only" scope — Pick/Pack/Dispatch/etc. belong
 * to a not-yet-approved Slice 2. `ShipmentController::index` genuinely
 * supports server-side `status`/`order_id`, hardcoded
 * `orderByDesc('created_at')`, Laravel's own default pagination (no
 * `per_page` override, no free-text `search` — confirmed by reading the
 * controller directly). Real, server-driven pagination — see
 * `queries.ts`'s own docblock for why this differs from Zones/Methods/
 * Rates' "fetch once" shape.
 *
 * **No "Warehouse" column** — `Shipment` has no warehouse field at all
 * (confirmed via the model's own docblock and a repo-wide search for
 * `Inventory` inside this module: zero matches). This is a genuine, honest
 * backend limitation, not an oversight — see the Slice 1 completion report.
 *
 * **No "Shipment Number" column** — no dedicated human-readable identifier
 * exists on `Shipment` the way `Order.orderNumber` does; the Shipment's own
 * UUID is shown, truncated, matching how this codebase already displays a
 * raw id elsewhere (e.g. Order Detail's own "Order ID" field) rather than
 * inventing a numbering scheme the backend doesn't have.
 *
 * **No "Customer" name** — `ShipmentResource` carries only `customerId`
 * (never a live foreign key, confirmed via `Shipment`'s own docblock); this
 * list is not enriched with an N+1 `GET /customers/{id}` call per row (real
 * performance cost for a real list), so the raw id is shown, truncated —
 * honest, not a real customer name lookup dressed up as one.
 */
export function ShipmentsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [orderId, setOrderId] = useState<string | undefined>(searchParams.get('order_id') ?? undefined);
  const [page, setPage] = useState(1);

  const { data, status: queryStatus, refetch } = useShipments({
    status: status === 'all' ? undefined : status,
    orderId,
    page,
  });
  const shipments = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => setPage(1), [status, orderId]);

  function clearOrderFilter(): void {
    setOrderId(undefined);
    const next = new URLSearchParams(searchParams);
    next.delete('order_id');
    setSearchParams(next, { replace: true });
  }

  const columns: DataTableColumn<ShipmentDTO>[] = [
    {
      id: 'shipment',
      header: 'Shipment',
      cell: (row) => <span className="font-mono text-caption">{row.id.slice(0, 8)}</span>,
    },
    {
      id: 'order',
      header: 'Order',
      cell: (row) => (
        <RequirePermission anyOf={['orders.orders.view']} inline={<Text variant="body">{row.orderNumber}</Text>}>
          <Link
            to={`/orders/${row.orderId}`}
            className="text-body text-brand hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.orderNumber}
          </Link>
        </RequirePermission>
      ),
    },
    { id: 'customer', header: 'Customer', cell: (row) => <span className="font-mono text-caption">{row.customerId.slice(0, 8)}</span> },
    { id: 'status', header: 'Status', cell: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status.replace('_', ' ')}</Badge> },
    {
      id: 'courier',
      header: 'Courier',
      cell: (row) => (row.courierProviderCode ? <span className="tabular-nums">{row.courierProviderCode}</span> : <span className="text-text-secondary">—</span>),
    },
    { id: 'created', header: 'Created', cell: (row) => formatDateTime(row.createdAt) },
    { id: 'updated', header: 'Updated', cell: (row) => formatDateTime(row.updatedAt) },
    {
      id: 'actions',
      header: '',
      className: 'w-10',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`View shipment ${row.id.slice(0, 8)}`}
          onClick={(e) => {
            e.stopPropagation();
            void navigate(`/shipping/shipments/${row.id}`);
          }}
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <CrudPageLayout
      header={{ title: 'Shipments', description: 'Every shipment created for a placed order, and its current status.' }}
      toolbar={
        <Toolbar
          filters={
            <FilterBar
              active={[
                ...(status === 'all' ? [] : [{ key: 'status', label: 'Status', displayValue: status.replace('_', ' ') }]),
                ...(orderId ? [{ key: 'order', label: 'Order', displayValue: orderId.slice(0, 8) }] : []),
              ]}
              onRemove={(key) => {
                if (key === 'status') setStatus('all');
                if (key === 'order') clearOrderFilter();
              }}
              onClearAll={() => {
                setStatus('all');
                clearOrderFilter();
              }}
            >
              <Select
                label="Status"
                value={status}
                onValueChange={(v) => setStatus(v as StatusFilter)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'picking', label: 'Picking' },
                  { value: 'picked', label: 'Picked' },
                  { value: 'packing', label: 'Packing' },
                  { value: 'packed', label: 'Packed' },
                  { value: 'dispatched', label: 'Dispatched' },
                  { value: 'in_transit', label: 'In transit' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </FilterBar>
          }
        />
      }
      pagination={data?.meta?.last_page ? { currentPage: data.meta.current_page ?? page, totalPages: data.meta.last_page, onPageChange: setPage } : undefined}
    >
      <DataTable
        columns={columns}
        data={shipments}
        getRowId={(row) => row.id}
        onRowClick={(row) => void navigate(`/shipping/shipments/${row.id}`)}
        status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
        onRetry={() => void refetch()}
        emptyState={
          status !== 'all' || orderId
            ? {
                icon: <PackageSearch className="size-8" aria-hidden="true" />,
                title: 'No matching shipments',
                description: 'No shipments match the current filter.',
              }
            : {
                icon: <PackageSearch className="size-8" aria-hidden="true" />,
                title: 'No shipments yet',
                description: 'A shipment is created automatically once an order is placed.',
              }
        }
      />
    </CrudPageLayout>
  );
}
