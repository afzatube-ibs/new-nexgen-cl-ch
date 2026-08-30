import { DollarSign } from 'lucide-react';
import { Text } from '@nexgen/ui';
import { DashboardWidgetCard } from '../../../framework/index.js';
import { formatCurrency } from '../shared/formatCurrency.js';
import { useOrderMetrics } from './queries.js';

/**
 * `OrderMetricsController::summary` — `revenueToday`, summed per real
 * currency actually placed today, excluding cancelled orders. Shown as one
 * line per currency, never blended into one number — this platform's own
 * real order data spans more than one currency (confirmed against the dev
 * database), so a single combined figure would be fabricated, not real.
 */
export function TodaysRevenueWidget() {
  const { data, status, refetch } = useOrderMetrics();
  const revenue = data?.revenueToday ?? [];

  return (
    <DashboardWidgetCard title="Today's Revenue" icon={DollarSign} status={status} onRetry={() => void refetch()}>
      {revenue.length === 0 ? (
        <>
          <Text as="p" variant="heading" className="tabular-nums">
            —
          </Text>
          <Text variant="caption" className="text-text-secondary">
            No revenue yet today
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
