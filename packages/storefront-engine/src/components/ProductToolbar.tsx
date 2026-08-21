'use client';

import type { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon, Text, cn } from '@nexgen/ui';
import { LayoutGrid, List } from 'lucide-react';
import { SortDropdown } from './SortDropdown.js';

/**
 * Store Components library — the Category page's own toolbar row: result
 * count, grid/list view toggle, sort, and a slot (`filterSlot`) for the
 * page's own `<FilterDrawer>` (mobile) so this component stays agnostic
 * of what filters exist, per `FilterSidebar.tsx`'s own "only two real
 * filter dimensions today" scoping.
 *
 * Grid/list view is a real, working `?view=` URL toggle (not merely
 * decorative) — the calling page reads `searchParams.view` to choose
 * which real layout (`ProductGrid` vs. a list-row layout) to render.
 */
export interface ProductToolbarProps {
  totalCount: number;
  sort?: string;
  direction?: string;
  view?: 'grid' | 'list';
  filterSlot?: ReactNode;
  className?: string;
}

export function ProductToolbar({ totalCount, sort, direction, view = 'grid', filterSlot, className }: ProductToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setView(nextView: 'grid' | 'list') {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', nextView);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4', className)}>
      <div className="flex items-center gap-3">
        {filterSlot}
        <Text as="p" variant="body" className="text-text-secondary">
          {totalCount} {totalCount === 1 ? 'result' : 'results'}
        </Text>
      </div>
      <div className="flex items-center gap-3">
        <SortDropdown sort={sort} direction={direction} />
        <div role="group" aria-label="Layout" className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <button
            type="button"
            aria-pressed={view === 'grid'}
            aria-label="Grid view"
            onClick={() => setView('grid')}
            className={cn('flex h-8 w-8 items-center justify-center rounded', view === 'grid' ? 'bg-surface-subtle text-brand' : 'text-text-secondary hover:text-text-primary')}
          >
            <Icon icon={LayoutGrid} size="inline" />
          </button>
          <button
            type="button"
            aria-pressed={view === 'list'}
            aria-label="List view"
            onClick={() => setView('list')}
            className={cn('flex h-8 w-8 items-center justify-center rounded', view === 'list' ? 'bg-surface-subtle text-brand' : 'text-text-secondary hover:text-text-primary')}
          >
            <Icon icon={List} size="inline" />
          </button>
        </div>
      </div>
    </div>
  );
}
