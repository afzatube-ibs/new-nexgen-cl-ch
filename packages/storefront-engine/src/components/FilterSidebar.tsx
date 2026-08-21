import Link from 'next/link';
import { Icon, Text, cn } from '@nexgen/ui';
import { X } from 'lucide-react';

/**
 * Store Components library — the Category/Search filter panel. Plain
 * `<Link>`s, not client-side checkboxes + `router.push`, so every filter
 * combination is a real, bookmarkable, crawlable URL and works with no
 * client JS at all (`Pagination.tsx`'s own docblock states the identical
 * reasoning) — this milestone's own "Filter URL synchronization" build
 * item, achieved by construction rather than a `useEffect` syncing state
 * to the URL after the fact.
 *
 * **Real, honestly-scoped filter dimensions only**: the Gateway's
 * `/v1/products` route supports exactly two filters today — `category_id`
 * and `brand_id` (`SortDropdown.tsx`'s own docblock cites the same
 * `productListQuerySchema`). No price-range, attribute/variant, rating,
 * or "in stock only" filter exists on the real backend response yet —
 * this component renders only the groups it's given, and every real call
 * site in this milestone passes only Category/Brand groups. The absent
 * facets are named in `MISSING_ECOMMERCE_FEATURES_AUDIT.md`, not silently
 * implied to exist by a disabled/greyed-out group here.
 */
export interface FilterOption {
  id: string;
  label: string;
  href: string;
  active: boolean;
  count?: number;
}

export interface FilterGroup {
  title: string;
  options: FilterOption[];
}

export interface ActiveFilterChip {
  label: string;
  clearHref: string;
}

export interface FilterSidebarProps {
  groups: FilterGroup[];
  activeChips?: ActiveFilterChip[];
  clearAllHref?: string;
  className?: string;
}

export function FilterSidebar({ groups, activeChips = [], clearAllHref, className }: FilterSidebarProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {activeChips.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Text as="p" variant="caption" className="font-medium text-text-secondary">
              Active filters
            </Text>
            {clearAllHref && (
              <Link href={clearAllHref} className="text-caption text-brand hover:underline">
                Clear all
              </Link>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map((chip) => (
              <Link
                key={chip.label}
                href={chip.clearHref}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-caption text-text-primary hover:bg-surface"
              >
                {chip.label}
                <Icon icon={X} size="inline" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
          <Text as="p" variant="body-strong">
            {group.title}
          </Text>
          <ul className="flex flex-col gap-1">
            {group.options.length === 0 && (
              <li className="text-caption text-text-secondary">No options available</li>
            )}
            {group.options.map((option) => (
              <li key={option.id}>
                <Link
                  href={option.href}
                  aria-current={option.active ? 'true' : undefined}
                  className={cn(
                    'flex items-center justify-between rounded-md px-2 py-1.5 text-body transition-colors hover:bg-surface-subtle',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
                    option.active ? 'bg-surface-subtle font-medium text-brand' : 'text-text-primary',
                  )}
                >
                  <span>{option.label}</span>
                  {option.count !== undefined && <span className="text-caption text-text-secondary">{option.count}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
