import { Text } from '@nexgen/ui';
import { useCatalogProductBySku } from '../shared/catalogLookup.js';

export interface ProductAndSkuCellProps {
  sku: string;
}

/**
 * Merges what were two separate columns in the first cut of this screen
 * (Product, SKU) into one stacked cell — one fewer thing to horizontally
 * scan per row, and the SKU is still always visible, just demoted to a
 * caption once a real product name is available to lead with.
 */
export function ProductAndSkuCell({ sku }: ProductAndSkuCellProps) {
  const { data: product, isLoading } = useCatalogProductBySku(sku);

  if (isLoading) {
    return (
      <Text variant="body-strong" className="text-text-secondary">
        …
      </Text>
    );
  }

  if (!product) {
    return (
      <div>
        <Text variant="body-strong" title="No matching Catalog product for this SKU.">
          {sku}
        </Text>
        <Text variant="caption" className="text-text-secondary">
          Not in Catalog
        </Text>
      </div>
    );
  }

  return (
    <div>
      <Text variant="body-strong">{product.name}</Text>
      <Text variant="caption" className="text-text-secondary">
        {sku}
      </Text>
    </div>
  );
}
