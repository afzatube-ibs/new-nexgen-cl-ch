import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, CreditCard } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, Select } from '@nexgen/ui';
import type { PaymentDTO, PaymentStatus } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar, RequirePermission } from '../../../framework/index.js';
import { formatCurrency } from '../shared/formatCurrency.js';
import { usePayments } from './queries.js';

type StatusFilter = 'all' | PaymentStatus;

const STATUS_VARIANT: Record<PaymentStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'default',
  authorized: 'info',
  captured: 'success',
  failed: 'danger',
  cancelled: 'danger',
  voided: 'danger',
  partially_refunded: 'warning',
  refunded: 'warning',
};

function formatDateTime(value: string | null): string {
  return value ? new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

/**
 * Payments — `payments.payments.view`. Read-only, per Slice 1's own
 * explicit "Merchant Payment Management" scope — Initiate/Capture/Cancel/
 * Void/Refund/Bank-Transfer-verification belong to real, existing backend
 * capabilities this slice deliberately does not wrap. `PaymentController::
 * index` genuinely supports server-side `order_id`/`customer_id`/`status`,
 * hardcoded `orderByDesc('initiated_at')`, Laravel's own default
 * pagination — no free-text `search`, no `gateway_code` filter, confirmed
 * absent by reading the controller directly, so neither is built here.
 *
 * `gatewayCode` is shown as the raw code (`bkash`, `cod`, ...), not resolved
 * against the real `GET /payments/methods` registry on this list — Payment
 * Detail is where a friendly label earns its own request; a per-row lookup
 * here would mean one extra render-blocking dependency for a value that's
 * already a legible, real backend identifier.
 */
export function PaymentsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [orderId, setOrderId] = useState<string | undefined>(searchParams.get('order_id') ?? undefined);
  const [customerId, setCustomerId] = useState<string | undefined>(searchParams.get('customer_id') ?? undefined);
  const [page, setPage] = useState(1);

  const { data, status: queryStatus, refetch } = usePayments({
    status: status === 'all' ? undefined : status,
    orderId,
    customerId,
    page,
  });
  const payments = data?.data ?? [];

  useEffect(() => setPage(1), [status, orderId, customerId]);

  function clearFilter(key: 'order' | 'customer'): void {
    const next = new URLSearchParams(searchParams);
    if (key === 'order') {
      setOrderId(undefined);
      next.delete('order_id');
    } else {
      setCustomerId(undefined);
      next.delete('customer_id');
    }
    setSearchParams(next, { replace: true });
  }

  const columns: DataTableColumn<PaymentDTO>[] = [
    { id: 'payment', header: 'Payment', cell: (row) => <span className="font-mono text-caption">{row.id.slice(0, 8)}</span> },
    {
      id: 'order',
      header: 'Order',
      cell: (row) => (
        <RequirePermission anyOf={['orders.orders.view']} inline={<span className="font-mono text-caption">{row.orderId.slice(0, 8)}</span>}>
          <Link to={`/orders/${row.orderId}`} className="font-mono text-caption text-brand hover:underline" onClick={(e) => e.stopPropagation()}>
            {row.orderId.slice(0, 8)}
          </Link>
        </RequirePermission>
      ),
    },
    {
      id: 'customer',
      header: 'Customer',
      cell: (row) =>
        row.customerId ? (
          <RequirePermission anyOf={['customers.customers.view']} inline={<span className="font-mono text-caption">{row.customerId.slice(0, 8)}</span>}>
            <Link to={`/customers/${row.customerId}`} className="font-mono text-caption text-brand hover:underline" onClick={(e) => e.stopPropagation()}>
              {row.customerId.slice(0, 8)}
            </Link>
          </RequirePermission>
        ) : (
          <span className="font-mono text-caption">—</span>
        ),
    },
    { id: 'gateway', header: 'Gateway', cell: (row) => <span className="uppercase tabular-nums">{row.gatewayCode}</span> },
    { id: 'amount', header: 'Amount', cell: (row) => <span className="tabular-nums">{formatCurrency(row.amount, row.currencyCode)}</span> },
    { id: 'status', header: 'Status', cell: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status.replace('_', ' ')}</Badge> },
    { id: 'initiated', header: 'Initiated', cell: (row) => formatDateTime(row.initiatedAt) },
    {
      id: 'actions',
      header: '',
      className: 'w-10',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`View payment ${row.id.slice(0, 8)}`}
          onClick={(e) => {
            e.stopPropagation();
            void navigate(`/payments/payments/${row.id}`);
          }}
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <CrudPageLayout
      header={{ title: 'Payments', description: 'Every payment initiated against a placed order, and its current status.' }}
      toolbar={
        <Toolbar
          filters={
            <FilterBar
              active={[
                ...(status === 'all' ? [] : [{ key: 'status', label: 'Status', displayValue: status.replace('_', ' ') }]),
                ...(orderId ? [{ key: 'order', label: 'Order', displayValue: orderId.slice(0, 8) }] : []),
                ...(customerId ? [{ key: 'customer', label: 'Customer', displayValue: customerId.slice(0, 8) }] : []),
              ]}
              onRemove={(key) => {
                if (key === 'status') setStatus('all');
                if (key === 'order') clearFilter('order');
                if (key === 'customer') clearFilter('customer');
              }}
              onClearAll={() => {
                setStatus('all');
                clearFilter('order');
                clearFilter('customer');
              }}
            >
              <Select
                label="Status"
                value={status}
                onValueChange={(v) => setStatus(v as StatusFilter)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'authorized', label: 'Authorized' },
                  { value: 'captured', label: 'Captured' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'cancelled', label: 'Cancelled' },
                  { value: 'voided', label: 'Voided' },
                  { value: 'partially_refunded', label: 'Partially refunded' },
                  { value: 'refunded', label: 'Refunded' },
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
        data={payments}
        getRowId={(row) => row.id}
        onRowClick={(row) => void navigate(`/payments/payments/${row.id}`)}
        status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
        onRetry={() => void refetch()}
        emptyState={
          status !== 'all' || orderId || customerId
            ? {
                icon: <CreditCard className="size-8" aria-hidden="true" />,
                title: 'No matching payments',
                description: 'No payments match the current filter.',
              }
            : {
                icon: <CreditCard className="size-8" aria-hidden="true" />,
                title: 'No payments yet',
                description: 'A payment appears here once a customer submits one at checkout.',
              }
        }
      />
    </CrudPageLayout>
  );
}
