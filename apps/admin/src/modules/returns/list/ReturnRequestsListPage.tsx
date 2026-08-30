import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, Plus, PackageSearch } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, Select, Text } from '@nexgen/ui';
import type { ReturnRequestDTO, ReturnRequestStatus } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, RequirePermission } from '../../../framework/index.js';
import { useReturnRequests } from '../shared/queries.js';
import { ReturnRequestFormDialog } from '../ReturnRequestFormDialog.js';

type StatusFilter = 'all' | ReturnRequestStatus;

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

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

/**
 * Return Requests — `returns.requests.view`. `ReturnRequestController::
 * index` genuinely supports server-side `status`/`order_id`/`customer_id`,
 * hardcoded ordering, Laravel's own default pagination (no `per_page`
 * override, no free-text `search` — confirmed by reading the controller
 * directly). Real, server-driven pagination, mirroring `ShipmentsListPage`'s
 * own shape exactly.
 *
 * **No "Customer" name column** — `ReturnRequestResource` carries only
 * `customerId` (never a live foreign key); this list is not enriched with
 * an N+1 `GET /customers/{id}` call per row, matching Shipments' own
 * identical, documented decision.
 */
export function ReturnRequestsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [orderId, setOrderId] = useState<string | undefined>(searchParams.get('order_id') ?? undefined);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, status: queryStatus, refetch } = useReturnRequests({
    status: status === 'all' ? undefined : status,
    orderId,
    page,
  });
  const returnRequests = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => setPage(1), [status, orderId]);

  function clearOrderFilter(): void {
    setOrderId(undefined);
    const next = new URLSearchParams(searchParams);
    next.delete('order_id');
    setSearchParams(next, { replace: true });
  }

  const columns: DataTableColumn<ReturnRequestDTO>[] = [
    { id: 'rma', header: 'RMA', cell: (row) => <span className="font-mono text-caption">{row.rmaNumber}</span> },
    {
      id: 'order',
      header: 'Order',
      cell: (row) => (
        <RequirePermission anyOf={['orders.orders.view']} inline={<Text variant="body">{row.orderId.slice(0, 8)}</Text>}>
          <Link to={`/orders/${row.orderId}`} className="text-body text-brand hover:underline" onClick={(e) => e.stopPropagation()}>
            {row.orderId.slice(0, 8)}
          </Link>
        </RequirePermission>
      ),
    },
    { id: 'customer', header: 'Customer', cell: (row) => <span className="font-mono text-caption">{row.customerId.slice(0, 8)}</span> },
    { id: 'type', header: 'Type', cell: (row) => <span className="capitalize">{row.type}</span> },
    { id: 'reason', header: 'Reason', cell: (row) => REASON_LABEL[row.reason] ?? row.reason },
    { id: 'status', header: 'Status', cell: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status.replace(/_/g, ' ')}</Badge> },
    { id: 'created', header: 'Created', cell: (row) => formatDateTime(row.createdAt) },
    {
      id: 'actions',
      header: '',
      className: 'w-10',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`View return request ${row.rmaNumber}`}
          onClick={(e) => {
            e.stopPropagation();
            void navigate(`/returns/requests/${row.id}`);
          }}
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <CrudPageLayout
        header={{
          title: 'Return Requests',
          description: 'Every return or exchange a customer has requested, and its current status.',
          actions: (
            <RequirePermission anyOf={['returns.requests.manage']} inline={null}>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" /> New return request
              </Button>
            </RequirePermission>
          ),
        }}
        toolbar={
          <Toolbar
            filters={
              <FilterBar
                active={[
                  ...(status === 'all' ? [] : [{ key: 'status', label: 'Status', displayValue: status.replace(/_/g, ' ') }]),
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
                    { value: 'requested', label: 'Requested' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'pickup_scheduled', label: 'Pickup scheduled' },
                    { value: 'received', label: 'Received' },
                    { value: 'inspecting', label: 'Inspecting' },
                    { value: 'resolution_approved', label: 'Resolved' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'rejected', label: 'Rejected' },
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
          data={returnRequests}
          getRowId={(row) => row.id}
          onRowClick={(row) => void navigate(`/returns/requests/${row.id}`)}
          status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
          onRetry={() => void refetch()}
          emptyState={
            status !== 'all' || orderId
              ? { icon: <PackageSearch className="size-8" aria-hidden="true" />, title: 'No matching return requests', description: 'No return requests match the current filter.' }
              : { icon: <PackageSearch className="size-8" aria-hidden="true" />, title: 'No return requests yet', description: 'A return request is created once a customer starts a return, or staff create one on their behalf.' }
          }
        />
      </CrudPageLayout>
      <ReturnRequestFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
