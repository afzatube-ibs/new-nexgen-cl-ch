import Image from 'next/image';
import Link from 'next/link';
import { cn, EmptyState } from '@nexgen/ui';
import { SectionHeader } from '../components/SectionHeader.js';
import type { CategoryGridProps } from './types.js';

const COLUMN_CLASS: Record<NonNullable<CategoryGridProps['columns']>, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

/**
 * `STOREFRONT_COMPONENT_ENGINE.md` §2's `CategoryGrid` primitive.
 * `CategorySummary.image` is always `null` today (the real
 * `CategoryResource` has no image field — a genuine backend gap,
 * documented in the Gateway's own `composition/mappers.ts` docblock, not
 * invented here) — every card therefore renders its plain-token fallback
 * tile, honestly, rather than a broken `<img>`.
 *
 * Beta Milestone 2: renders a real `SectionHeader` when `heading` is
 * supplied (the Homepage's own "Featured Categories" build item) —
 * omitted entirely when a page composes this primitive without one.
 */
export function CategoryGrid({ categories, buildHref, columns = 4, heading, description, viewAllHref }: CategoryGridProps) {
  if (categories.length === 0) {
    if (!heading) return <EmptyState title="No categories yet" description="This store hasn't organized any categories yet." />;
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader heading={heading} description={description} viewAllHref={viewAllHref} />
        <EmptyState title="No categories yet" description="This store hasn't organized any categories yet." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {heading && <SectionHeader heading={heading} description={description} viewAllHref={viewAllHref} />}
      <div className={`grid gap-4 ${COLUMN_CLASS[columns]}`}>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={buildHref(category)}
          className={cn(
            'group flex flex-col overflow-hidden rounded-lg border border-border bg-surface',
            'transition-shadow duration-fast hover:shadow-elevation-2',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
          )}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-subtle">
            {category.image ? (
              <Image src={category.image.src} alt={category.image.alt || category.name} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition-transform duration-slow group-hover:scale-105" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-heading text-text-secondary">{category.name.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="p-3">
            <p className="text-body-strong text-text-primary">{category.name}</p>
          </div>
        </Link>
      ))}
      </div>
    </div>
  );
}
