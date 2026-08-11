import { Text } from '@nexgen/ui';
import { useStockItems } from '../stockLevels/queries.js';

export interface WarehouseStockCountCellProps {
  warehouseId: string;
}

/**
 * "Make each warehouse feel informative" — a real count, not an invented
 * one: `StockItemController::index` (apps/backend) already returns a true
 * `meta.total` for `GET /stock-items?warehouse_id=X` regardless of page
 * size (Laravel's `paginate()` computes the total independent of how many
 * rows are actually returned), so reading it costs nothing extra to
 * compute — just one bounded request per visible warehouse row, the same
 * per-row-join discipline `ProductAndSkuCell` already uses for Catalog.
 * Warehouses are a small list in practice (tens, not thousands), so this
 * is safe at the scale this screen actually operates at.
 */
export function WarehouseStockCountCell({ warehouseId }: WarehouseStockCountCellProps) {
  const { data, status } = useStockItems({ warehouseId, page: 1 });

  if (status === 'pending') {
    return (
      <Text variant="caption" className="text-text-secondary">
        …
      </Text>
    );
  }
  if (status === 'error') {
    return (
      <Text variant="caption" className="text-text-secondary">
        —
      </Text>
    );
  }

  const total = data?.meta?.total ?? 0;
  return (
    <Text variant="body" className="tabular-nums text-text-secondary">
      {total} {total === 1 ? 'SKU tracked' : 'SKUs tracked'}
    </Text>
  );
}
