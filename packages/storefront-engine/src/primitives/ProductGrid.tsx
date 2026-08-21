import { EmptyState } from '@nexgen/ui';
import { SectionHeader } from '../components/SectionHeader.js';
import { ProductCard } from './ProductCard.js';
import type { ProductGridProps } from './types.js';

const COLUMN_CLASS: Record<NonNullable<ProductGridProps['columns']>, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

/**
 * `STOREFRONT_COMPONENT_ENGINE.md` §2's `ProductGrid` primitive — real
 * data in, a real empty state when there genuinely is none (never a
 * fabricated placeholder row, matching this platform's own established
 * admin-side "no fake placeholder UI" bar applied to the storefront).
 *
 * Beta Milestone 2: this one primitive powers every real product rail on
 * the Homepage (Featured Products, Trending, Recently Added) and the
 * Category page's own grid — each a distinct real data source fed via
 * `products`, distinguished only by `heading` and which Gateway call the
 * page made, never by a different component.
 */
export function ProductGrid({ products, buildHref, columns = 4, emptyTitle = 'No products yet', emptyDescription = 'Check back soon — this store is still stocking up.', heading, description, viewAllHref }: ProductGridProps) {
  if (products.length === 0) {
    if (!heading) return <EmptyState title={emptyTitle} description={emptyDescription} />;
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader heading={heading} description={description} viewAllHref={viewAllHref} />
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {heading && <SectionHeader heading={heading} description={description} viewAllHref={viewAllHref} />}
      <div className={`grid gap-4 ${COLUMN_CLASS[columns]}`}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} href={buildHref(product)} />
        ))}
      </div>
    </div>
  );
}
