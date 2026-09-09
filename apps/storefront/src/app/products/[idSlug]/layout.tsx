import type { ReactNode } from 'react';
import { extractIdFromSegment, getAvailability, getProduct, StockBadge } from '@nexgen/storefront-engine';
import { Text } from '@nexgen/ui';

interface ProductLayoutProps {
  children: ReactNode;
  params: Promise<{ idSlug: string }>;
}

/**
 * Adds real Inventory availability to every PDP without coupling Catalog's
 * product contract to Inventory ownership. If Inventory is unavailable we
 * fail open to no stock claim; the product page itself remains browsable.
 */
export default async function ProductLayout({ children, params }: ProductLayoutProps) {
  const { idSlug } = await params;

  try {
    const product = await getProduct(extractIdFromSegment(idSlug));
    const availability = await getAvailability(product.sku).catch(() => ({ sku: product.sku, isAvailable: null }));

    if (availability.isAvailable === null) return children;

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <Text as="span" variant="caption" className="font-medium text-text-secondary">
            Inventory availability
          </Text>
          <StockBadge status={product.status} isAvailable={availability.isAvailable} />
        </div>
        {children}
      </div>
    );
  } catch {
    return children;
  }
}
