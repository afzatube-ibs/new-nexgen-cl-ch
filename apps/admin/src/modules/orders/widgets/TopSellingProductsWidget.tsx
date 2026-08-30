import { Trophy } from 'lucide-react';
import { Text } from '@nexgen/ui';
import { DashboardWidgetCard } from '../../../framework/index.js';
import { useTopSellingProducts } from './queries.js';

/**
 * `OrderMetricsController::topProducts` — all-time top sellers by real
 * total quantity sold, read from `order_items`' own `sku`/`product_name`
 * snapshot columns (no Catalog dependency — see that controller's own
 * docblock). No per-row link to a Catalog product page: `OrderItem.sku` is
 * an identifier-only snapshot, never a live Catalog foreign key, so a SKU
 * sold under a since-renamed or since-deleted product cannot honestly be
 * linked to one.
 */
export function TopSellingProductsWidget() {
  const { data, status, refetch } = useTopSellingProducts(5);
  const products = data ?? [];

  return (
    <DashboardWidgetCard title="Top Selling Products" icon={Trophy} status={status} onRetry={() => void refetch()}>
      {products.length === 0 ? (
        <Text variant="body" className="text-text-secondary">
          No products sold yet.
        </Text>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {products.map((product, index) => (
            <div key={product.sku} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <Text variant="caption" className="w-4 shrink-0 text-text-secondary">
                  {index + 1}
                </Text>
                <div className="min-w-0">
                  <Text variant="body-strong" className="truncate">
                    {product.productName}
                  </Text>
                  <Text variant="caption" className="truncate font-mono text-text-secondary">
                    {product.sku}
                  </Text>
                </div>
              </div>
              <Text variant="body" className="shrink-0 tabular-nums text-text-secondary">
                {product.totalQuantity} sold
              </Text>
            </div>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}
