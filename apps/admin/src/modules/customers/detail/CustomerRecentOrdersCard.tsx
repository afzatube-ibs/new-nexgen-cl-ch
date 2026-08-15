import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Text, Badge, Skeleton, ErrorState, Pagination } from '@nexgen/ui';
import type { OrderDTO, OrderStatus } from '@nexgen/api-client';
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
 * Read-only: no Order detail/create/status-transition capability exists
 * anywhere in this admin yet (no Orders module has been built), so rows
 * here are plain, non-interactive summaries — clicking through to a
 * fuller Order view is explicitly a future module's own scope, not
 * something to fake a link toward here. No lifetime spend or average
 * order value is computed — `OrderController::index` returns a plain
 * list, never an aggregate, and deriving one client-side would be
 * inventing a business metric this backend has never committed to.
 */
export function CustomerRecentOrdersCard({ customerId }: { customerId: string }) {
  const [page, setPage] = useState(1);
  const { data, status, refetch } = useCustomerOrders(customerId, page);
  const orders = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
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
                <div key={order.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
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
                </div>
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
