import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Text, Badge, Button, Skeleton, ErrorState, Pagination } from '@nexgen/ui';
import type { OrderDTO, OrderStatus } from '@nexgen/api-client';
import { RequirePermission } from '../../../framework/index.js';
import { formatCurrency } from '../shared/formatCurrency.js';
import { useCustomerOrders } from '../shared/queries.js';

const STATUS_VARIANT: Record<OrderStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'default',
  confirmed: 'info',
  processing: 'warning',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

/**
 * Recent Orders — `orders.orders.view`, a real, server-filtered read of
 * Orders' own `GET /orders?customer_id=` (`OrderController::index`,
 * confirmed by reading it directly: genuinely supports `customer_id`, not
 * something this slice invented). A separate permission from
 * `customers.*` — the caller wrapping this component in
 * `RequirePermission` hides the whole card, not just its data, for a
 * merchant who can see Customers but not Orders.
 *
 * Rows link to the real Order Detail page (`/orders/:id`) and "View all"
 * deep-links into the real Orders List pre-filtered to this customer
 * (`/orders?customer_id=`) — both now real, existing routes as of Phase
 * 2.6's own Order Management module; this card was read-only with no
 * links at all until that module existed (Phase 2.5's own note on this
 * exact point). No lifetime spend or average order value is computed —
 * `OrderController::index` returns a plain list, never an aggregate, and
 * deriving one client-side would be inventing a business metric this
 * backend has never committed to.
 */
export function CustomerRecentOrdersCard({ customerId, customerName }: { customerId: string; customerName: string }) {
  const [page, setPage] = useState(1);
  const { data, status, refetch } = useCustomerOrders(customerId, page);
  const orders = data?.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Recent Orders</CardTitle>
        <RequirePermission anyOf={['orders.orders.view']} inline={null}>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/orders?customer_id=${customerId}`} state={{ customerName }}>
              View all
            </Link>
          </Button>
        </RequirePermission>
      </CardHeader>
      <CardContent>
        {status === 'pending' && (
          <div className="flex flex-col gap-2">
            <Skeleton shape="block" className="h-10 w-full" />
            <Skeleton shape="block" className="h-10 w-full" />
          </div>
        )}
        {status === 'error' && <ErrorState onRetry={() => void refetch()} />}
        {status === 'success' && orders.length === 0 && (
          <div className="flex items-center gap-2 text-text-secondary">
            <ShoppingBag className="size-4" aria-hidden="true" />
            <Text variant="body">No orders yet.</Text>
          </div>
        )}
        {status === 'success' && orders.length > 0 && (
          <>
            <div className="flex flex-col divide-y divide-border">
              {orders.map((order: OrderDTO) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between gap-3 rounded-sm py-2.5 first:pt-0 last:pb-0 hover:bg-surface-subtle/60"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Text variant="body-strong" className="tabular-nums">
                        {order.orderNumber}
                      </Text>
                      <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
                    </div>
                    <Text variant="caption" className="text-text-secondary">
                      {new Date(order.placedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </Text>
                  </div>
                  <Text variant="body-strong" className="tabular-nums">
                    {formatCurrency(order.grandTotal, order.currencyCode)}
                  </Text>
                </Link>
              ))}
            </div>
            {data?.meta?.last_page && data.meta.last_page > 1 && (
              <div className="mt-3">
                <Pagination currentPage={data.meta.current_page ?? page} totalPages={data.meta.last_page} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
