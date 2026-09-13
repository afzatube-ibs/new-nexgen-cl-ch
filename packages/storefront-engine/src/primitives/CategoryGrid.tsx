import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn, EmptyState } from '@nexgen/ui';
import { SectionHeader } from '../components/SectionHeader.js';
import type { CategoryGridProps } from './types.js';

const COLUMN_CLASS: Record<NonNullable<CategoryGridProps['columns']>, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

/** Category discovery using only real CategorySummary data and theme tokens. */
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
    <div className="flex flex-col gap-5">
      {heading && <SectionHeader heading={heading} description={description} viewAllHref={viewAllHref} />}
      <div className={`grid gap-4 sm:gap-5 ${COLUMN_CLASS[columns]}`}>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={buildHref(category)}
            className={cn(
              'group relative flex min-h-44 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-5',
              'transition-all duration-fast hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-elevation-2',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
            )}
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand/5 transition-transform duration-slow group-hover:scale-125" aria-hidden="true" />

            <div className="relative flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-brand/10 text-heading text-brand">
                {category.image ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={category.image.src}
                      alt={category.image.alt || category.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <span aria-hidden="true">{category.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors group-hover:border-brand/30 group-hover:text-brand">
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>

            <div className="relative mt-8 flex flex-col gap-1">
              <p className="text-heading text-text-primary">{category.name}</p>
              {category.description && (
                <p className="line-clamp-2 text-caption text-text-secondary">{category.description}</p>
              )}
              <span className="mt-2 text-caption font-medium text-brand">Explore category →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
