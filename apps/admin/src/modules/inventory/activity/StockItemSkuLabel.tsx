import { Text } from '@nexgen/ui';
import { useStockItemById } from '../stockLevels/queries.js';

export interface StockItemSkuLabelProps {
  stockItemId: string;
}

/**
 * `stock.adjusted` audit-log entries carry only a `targetId` (the
 * StockItem's own id) — never its `sku` — so resolving "which SKU was this"
 * needs one extra lookup per unique id shown on the page (`GET
 * /stock-items/{id}`, cached by id). Same bounded, per-visible-row join
 * discipline as `ProductAndSkuCell`'s Catalog-side lookup.
 */
export function StockItemSkuLabel({ stockItemId }: StockItemSkuLabelProps) {
  const { data: stockItem, isLoading } = useStockItemById(stockItemId);

  if (isLoading) {
    return (
      <Text as="span" variant="caption" className="text-text-secondary">
        …
      </Text>
    );
  }

  return (
    <Text as="span" variant="caption" className="text-text-secondary">
      {stockItem?.sku ?? `item ${stockItemId.slice(0, 8)}`}
    </Text>
  );
}
