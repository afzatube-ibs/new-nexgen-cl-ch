import { EmptyState } from '@nexgen/ui';
import { SectionHeader } from '../components/SectionHeader.js';
import { toMoney } from '../pricing/toMoney.js';
import { ProductCard } from './ProductCard.js';
import type { ProductGridProps } from './types.js';

const COLUMN_CLASS: Record<NonNullable<ProductGridProps['columns']>, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

/**
 * Real product data in, real empty states out. This one grid continues to
 * power featured, recommendation, category and recently-added surfaces;
 * spacing now matches the stronger merchandising hierarchy used elsewhere.
 */
export function ProductGrid({ products, buildHref, columns = 4, emptyTitle = 'No products yet', emptyDescription = 'Check back soon — this store is still stocking up.', heading, description, viewAllHref }: ProductGridProps) {
  if (products.length === 0) {
    if (!heading) return <EmptyState title={emptyTitle} description={emptyDescription} />;
    return (
      <div className="flex flex-col gap-5">
        <SectionHeader heading={heading} description={description} viewAllHref={viewAllHref} />
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {heading && <SectionHeader heading={heading} description={description} viewAllHref={viewAllHref} />}
      <div className={`grid gap-4 sm:gap-5 ${COLUMN_CLASS[columns]}`}>
        {products.map((product) => {
          const { price, compareAtPrice } = toMoney(product.price);
          return <ProductCard key={product.id} product={product} href={buildHref(product)} price={price} compareAtPrice={compareAtPrice} />;
        })}
      </div>
    </div>
  );
}
