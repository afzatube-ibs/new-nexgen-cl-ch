import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Text } from '@nexgen/ui';
import { DashboardWidgetCard } from '../../../framework/index.js';
import { useOrderMetrics } from './queries.js';

/** `OrderMetricsController::summary` — `pendingOrders`, the real, actionable "needs attention" count, regardless of when each order was placed. */
export function PendingOrdersWidget() {
  const { data, status, refetch } = useOrderMetrics();

  return (
    <DashboardWidgetCard title="Pending Orders" icon={Clock} status={status} onRetry={() => void refetch()}>
      <Link to="/orders?status=pending" className="block hover:opacity-80">
        <Text as="p" variant="heading" className="tabular-nums">
          {data?.pendingOrders ?? 0}
        </Text>
        <Text variant="caption" className="text-text-secondary">
          Awaiting confirmation
        </Text>
      </Link>
    </DashboardWidgetCard>
  );
}
