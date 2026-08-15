import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Eye, Package } from 'lucide-react';
import { DataTable, type DataTableColumn, Button, Badge, Select, Text } from '@nexgen/ui';
import type { OrderDTO, OrderStatus } from '@nexgen/api-client';
import { CrudPageLayout, Toolbar, FilterBar } from '../../../framework/index.js';
import { formatCurrency } from '../shared/formatCurrency.js';
import { useOrders, useCustomerName } from '../shared/queries.js';

type StatusFilter = 'all' | OrderStatus;

const STATUS_VARIANT: Record<OrderStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'default',
  confirmed: 'info',
  processing: 'warning',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * Debounces a fast-changing value before it drives a network lookup —
 * duplicated locally per this codebase's own established per-call-site
 * precedent (`CustomersListPage`'s identically-named/shaped hook). Orders'
 * own `q` search (`order_number`/`customer_name`/`customer_email` `LIKE`,
 * confirmed by reading `OrderController::index` directly) would otherwise
 * fire one real request per keystroke, the same class of issue Customers'
 * own Freeze Audit found and fixed — applied here from the start.
 */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Orders — `orders.orders.view`. `OrderController::index` genuinely
 * supports server-side `q`, `status`, and `customer_id`, confirmed by
 * reading the controller directly — every filter here is a real request,
 * never client-side filtering. Sort is hardcoded server-side
 * (`orderByDesc('placed_at')`, no override) — this list deliberately offers
 * no sortable-column UI, since the backend has nothing to honor it with (a
 * dishonest control this engagement has consistently avoided building
 * elsewhere, e.g. Customers' own "Updated" column). Pagination is
 * Laravel's own default (no `per_page` override to read).
 *
 * The `customer_id` filter is populated from the URL (`?customer_id=`),
 * the real deep-link `CustomerRecentOrdersCard`'s own "View all" now
 * points at — see that component's docblock. No customer-picker UI exists
 * here: nothing in this slice's approved scope calls for one, and this
 * filter is a real, working capability without it (an operator can also
 * bookmark or share a filtered URL directly).
 */
export function OrdersListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCustomerId = searchParams.get('customer_id') ?? undefined;
  const customerNameFromNav = (location.state as { customerName?: string } | null)?.customerName;

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [customerId, setCustomerId] = useState<string | undefined>(initialCustomerId);
  const [page, setPage] = useState(1);

  // Router state (the customer's name, passed by `CustomerRecentOrdersCard`'s
  // own "View all" link) doesn't survive a page reload or a bookmarked/
  // shared URL — fall back to a real lookup rather than showing the raw id.
  const { data: fetchedCustomerName } = useCustomerName(customerId && !customerNameFromNav ? customerId : undefined);
  const customerDisplayName = customerNameFromNav ?? fetchedCustomerName;

  const { data, status: queryStatus, refetch } = useOrders({
    q: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    customerId,
    page,
  });
  const orders = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => setPage(1), [debouncedSearch, status, customerId]);

  function clearCustomerFilter(): void {
    setCustomerId(undefined);
    const next = new URLSearchParams(searchParams);
    next.delete('customer_id');
    setSearchParams(next, { replace: true });
  }

  const columns: DataTableColumn<OrderDTO>[] = [
    { id: 'orderNumber', header: 'Order Number', cell: (row) => <Text variant="body-strong" className="tabular-nums">{row.orderNumber}</Text> },
    {
      id: 'customer',
      header: 'Customer',
      cell: (row) => (
        <div>
          <Text variant="body">{row.customerName}</Text>
          <Text variant="caption" className="text-text-secondary">
            {row.customerEmail}
          </Text>
        </div>
      ),
    },
    { id: 'status', header: 'Status', cell: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge> },
    { id: 'grandTotal', header: 'Grand Total', cell: (row) => <span className="tabular-nums">{formatCurrency(row.grandTotal, row.currencyCode)}</span> },
    { id: 'placedAt', header: 'Placed At', cell: (row) => formatDateTime(row.placedAt) },
    { id: 'updatedAt', header: 'Updated At', cell: (row) => (row.updatedAt ? formatDateTime(row.updatedAt) : '—') },
    {
      id: 'actions',
      header: '',
      className: 'w-10',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`View order ${row.orderNumber}`}
          onClick={(e) => {
            e.stopPropagation();
            void navigate(`/orders/${row.id}`);
          }}
        >
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <CrudPageLayout
      header={{ title: 'Orders', description: 'Every order placed through Checkout, and its full lifecycle.' }}
      toolbar={
        <Toolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search order number, customer name, or email…"
          filters={
            <FilterBar
              active={[
                ...(status === 'all' ? [] : [{ key: 'status', label: 'Status', displayValue: status }]),
                ...(customerId ? [{ key: 'customer', label: 'Customer', displayValue: customerDisplayName ?? customerId }] : []),
              ]}
              onRemove={(key) => {
                if (key === 'status') setStatus('all');
                if (key === 'customer') clearCustomerFilter();
              }}
              onClearAll={() => {
                setStatus('all');
                clearCustomerFilter();
              }}
            >
              <Select
                label="Status"
                value={status}
                onValueChange={(v) => setStatus(v as StatusFilter)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'shipped', label: 'Shipped' },
                  { value: 'delivered', label: 'Delivered' },
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
        data={orders}
        getRowId={(row) => row.id}
        onRowClick={(row) => void navigate(`/orders/${row.id}`)}
        status={queryStatus === 'pending' ? 'loading' : queryStatus === 'error' ? 'error' : 'success'}
        onRetry={() => void refetch()}
        emptyState={
          status !== 'all' || customerId || debouncedSearch.trim()
            ? {
                icon: <Package className="size-8" aria-hidden="true" />,
                title: 'No matching orders',
                description: 'No orders match the current filter or search.',
              }
            : {
                icon: <Package className="size-8" aria-hidden="true" />,
                title: 'No orders yet',
                description: 'Orders placed through Checkout will appear here.',
              }
        }
      />
    </CrudPageLayout>
  );
}
