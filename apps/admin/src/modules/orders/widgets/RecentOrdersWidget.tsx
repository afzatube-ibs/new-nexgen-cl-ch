import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { Text, Badge } from '@nexgen/ui';
import type { OrderStatus } from '@nexgen/api-client';
import { DashboardWidgetCard } from '../../../framework/index.js';
import { formatCurrency } from '../shared/formatCurrency.js';
import { useRecentOrders } from './queries.js';

const STATUS_VARIANT: Record<OrderStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  pending: 'default',
  confirmed: 'info',
  processing: 'warning',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

const DISPLAY_COUNT = 5;

/** The real "Recent Orders" widget — the same `listOrders()` every OrdersListPage call uses, already sorted newest-first by the backend; just the first few rows. */
export function RecentOrdersWidget() {
  const { data, status, refetch } = useRecentOrders();
  const orders = (data?.data ?? []).slice(0, DISPLAY_COUNT);

  return (
    <DashboardWidgetCard
      title="Recent Orders"
      icon={Package}
      status={status}
      onRetry={() => void refetch()}
      action={
        <Link to="/orders" className="text-caption text-brand hover:underline">
          View all
        </Link>
      }
    >
      {orders.length === 0 ? (
        <Text variant="body" className="text-text-secondary">
          No orders placed yet.
        </Text>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {orders.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:bg-surface-subtle">
              <div className="min-w-0">
                <Text variant="body-strong" className="truncate tabular-nums">
                  {order.orderNumber}
                </Text>
                <Text variant="caption" className="truncate text-text-secondary">
                  {order.customerName}
                </Text>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Text variant="body" className="tabular-nums">
                  {formatCurrency(order.grandTotal, order.currencyCode)}
                </Text>
                <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}
