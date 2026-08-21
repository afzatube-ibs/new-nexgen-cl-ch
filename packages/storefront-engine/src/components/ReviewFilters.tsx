'use client';

import { Icon, cn } from '@nexgen/ui';
import { Star } from 'lucide-react';

/**
 * Store Components library — real, functional review filter chips (by
 * star rating) and a real sort control. Genuinely working UI — the
 * `onChange`/`onSortChange` callbacks are real, the caller (once a real
 * Reviews backend exists) wires them to a real filtered/sorted fetch or
 * client-side slice. No live page calls these with real review data yet
 * (`ReviewCard.tsx`'s own docblock).
 */
export interface ReviewFiltersProps {
  /** Real per-rating counts, when known — renders the count next to each filter chip; omit to hide counts. */
  countsByRating?: Partial<Record<1 | 2 | 3 | 4 | 5, number>>;
  activeRating: number | null;
  onChange: (rating: number | null) => void;
  className?: string;
}

export function ReviewFilters({ countsByRating, activeRating, onChange, className }: ReviewFiltersProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="group" aria-label="Filter reviews by rating">
      <button
        type="button"
        aria-pressed={activeRating === null}
        onClick={() => onChange(null)}
        className={cn(
          'rounded-full border px-3 py-1 text-caption transition-colors',
          activeRating === null ? 'border-brand bg-brand text-white' : 'border-border text-text-primary hover:bg-surface-subtle',
        )}
      >
        All
      </button>
      {[5, 4, 3, 2, 1].map((stars) => (
        <button
          key={stars}
          type="button"
          aria-pressed={activeRating === stars}
          onClick={() => onChange(stars)}
          className={cn(
            'flex items-center gap-1 rounded-full border px-3 py-1 text-caption transition-colors',
            activeRating === stars ? 'border-brand bg-brand text-white' : 'border-border text-text-primary hover:bg-surface-subtle',
          )}
        >
          {stars}
          <Icon icon={Star} size="inline" className="fill-current" />
          {countsByRating?.[stars as 1 | 2 | 3 | 4 | 5] !== undefined && <span>({countsByRating[stars as 1 | 2 | 3 | 4 | 5]})</span>}
        </button>
      ))}
    </div>
  );
}

export type ReviewSortValue = 'newest' | 'oldest' | 'highest' | 'lowest' | 'most-helpful';

export interface ReviewSortProps {
  value: ReviewSortValue;
  onChange: (value: ReviewSortValue) => void;
  className?: string;
}

const SORT_LABELS: Record<ReviewSortValue, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  highest: 'Highest rated',
  lowest: 'Lowest rated',
  'most-helpful': 'Most helpful',
};

export function ReviewSort({ value, onChange, className }: ReviewSortProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ReviewSortValue)}
      aria-label="Sort reviews"
      className={cn(
        'h-9 rounded-md border border-border bg-surface px-3 text-body text-text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
        className,
      )}
    >
      {(Object.keys(SORT_LABELS) as ReviewSortValue[]).map((option) => (
        <option key={option} value={option}>
          {SORT_LABELS[option]}
        </option>
      ))}
    </select>
  );
}
