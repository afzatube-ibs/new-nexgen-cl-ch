import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Text } from '@nexgen/ui';
import { DashboardWidgetCard } from '../../../framework/index.js';
import { useOrderMetrics } from './queries.js';

/** `OrderMetricsController::summary` — `ordersToday`, every order placed today regardless of status (a cancelled order was still genuinely placed). */
export function TodaysOrdersWidget() {
  const { data, status, refetch } = useOrderMetrics();

  return (
    <DashboardWidgetCard title="Today's Orders" icon={ShoppingCart} status={status} onRetry={() => void refetch()}>
      <Link to="/orders" className="block hover:opacity-80">
        <Text as="p" variant="heading" className="tabular-nums">
          {data?.ordersToday ?? 0}
        </Text>
        <Text variant="caption" className="text-text-secondary">
          Placed since midnight
        </Text>
      </Link>
    </DashboardWidgetCard>
  );
}
