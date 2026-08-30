import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Text, Badge } from '@nexgen/ui';
import { DashboardWidgetCard } from '../../../framework/index.js';
import { LOW_STOCK_THRESHOLD } from '../shared/stockHealth.js';
import { useStockItems } from '../stockLevels/queries.js';

const DISPLAY_COUNT = 5;

/**
 * Production Completion Plan v2, Milestone 8 (Dashboard Real Widgets) — the
 * real Low Stock widget, backed by `StockItemController::index()`'s own
 * `quantity_lte` filter (Milestone 8's own backend addition). Uses the
 * same `LOW_STOCK_THRESHOLD` constant `stockHealth.ts` already defines for
 * the Stock Levels page's own badge coloring — one real threshold, never a
 * second, invented one. Deliberately includes out-of-stock items (`<= 0`)
 * as well, unlike that page's own separate "low_stock" display category:
 * a dashboard "needs restocking soon" widget is honestly more urgent than
 * a list-row badge, and zero-stock items are the most urgent case, not an
 * excluded one.
 */
export function LowStockWidget() {
  const { data, status, refetch } = useStockItems({ quantityLte: LOW_STOCK_THRESHOLD });
  const items = (data?.data ?? []).slice(0, DISPLAY_COUNT);
  const total = data?.meta?.total;

  return (
    <DashboardWidgetCard
      title="Low Stock"
      icon={AlertTriangle}
      status={status}
      onRetry={() => void refetch()}
      action={
        <Link to="/inventory/stock-levels" className="text-caption text-brand hover:underline">
          View all
        </Link>
      }
    >
      {items.length === 0 ? (
        <Text variant="body" className="text-text-secondary">
          Nothing is running low right now.
        </Text>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {items.map((item) => {
            const available = item.quantityOnHand - item.quantityReserved;
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <Text variant="body-strong" className="truncate font-mono">
                  {item.sku}
                </Text>
                <Badge variant={available <= 0 ? 'danger' : 'warning'}>{available <= 0 ? 'Out of stock' : `${available} left`}</Badge>
              </div>
            );
          })}
          {typeof total === 'number' && total > DISPLAY_COUNT && (
            <Text variant="caption" className="pt-2.5 text-text-secondary">
              +{total - DISPLAY_COUNT} more
            </Text>
          )}
        </div>
      )}
    </DashboardWidgetCard>
  );
}
