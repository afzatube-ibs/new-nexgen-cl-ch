import { TrendingUp } from 'lucide-react';
import { Text } from '@nexgen/ui';
import { DashboardWidgetCard } from '../../../framework/index.js';
import { formatCurrency } from '../shared/formatCurrency.js';
import { useOrderMetrics } from './queries.js';

/** `OrderMetricsController::summary` — `revenueThisMonth`. See `TodaysRevenueWidget`'s own docblock for why this is per-currency, never blended. */
export function ThisMonthRevenueWidget() {
  const { data, status, refetch } = useOrderMetrics();
  const revenue = data?.revenueThisMonth ?? [];

  return (
    <DashboardWidgetCard title="This Month's Revenue" icon={TrendingUp} status={status} onRetry={() => void refetch()}>
      {revenue.length === 0 ? (
        <>
          <Text as="p" variant="heading" className="tabular-nums">
            —
          </Text>
          <Text variant="caption" className="text-text-secondary">
            No revenue yet this month
          </Text>
        </>
      ) : (
        <div className="flex flex-col gap-0.5">
          {revenue.map((r) => (
            <Text key={r.currencyCode} as="p" variant="heading" className="tabular-nums">
              {formatCurrency(r.amount, r.currencyCode)}
            </Text>
          ))}
          <Text variant="caption" className="text-text-secondary">
            Excludes cancelled orders
          </Text>
        </div>
      )}
    </DashboardWidgetCard>
  );
}
