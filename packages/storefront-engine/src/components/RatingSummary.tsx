import { Icon, Text, cn } from '@nexgen/ui';
import { Star } from 'lucide-react';

/**
 * Store Components library — Beta Milestone 2.6's own "Review Foundation"
 * build item. **No fake reviews.** No reviews backend exists anywhere in
 * the platform (`MISSING_ECOMMERCE_FEATURES_AUDIT.md` §2.6, restated in
 * every review since Milestone 1) — this component is real and ready,
 * but every real call site passes `totalCount: 0`, and its honest empty
 * state (not a fabricated 5-star average) is what actually renders. The
 * distribution bars are real math over real counts when they exist —
 * never invented percentages.
 */
export interface RatingDistributionBucket {
  stars: 1 | 2 | 3 | 4 | 5;
  count: number;
}

export interface RatingSummaryProps {
  averageRating: number | null;
  totalCount: number;
  distribution?: RatingDistributionBucket[];
  className?: string;
}

export function RatingSummary({ averageRating, totalCount, distribution, className }: RatingSummaryProps) {
  if (totalCount === 0 || averageRating === null) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <Text as="p" variant="body-strong">
          No reviews yet
        </Text>
        <Text as="p" variant="caption" className="text-text-secondary">
          Be the first to share your experience with this product.
        </Text>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6', className)}>
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-1">
          <Text as="span" variant="heading">
            {averageRating.toFixed(1)}
          </Text>
          <div className="flex" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <Icon key={index} icon={Star} size="inline" className={index < Math.round(averageRating) ? 'fill-current text-brand' : 'text-border'} />
            ))}
          </div>
        </div>
        <Text as="p" variant="caption" className="text-text-secondary">
          Based on {totalCount} {totalCount === 1 ? 'review' : 'reviews'}
        </Text>
      </div>

      {distribution && distribution.length > 0 && (
        <div className="flex flex-1 flex-col gap-1">
          {[5, 4, 3, 2, 1].map((stars) => {
            const bucket = distribution.find((entry) => entry.stars === stars);
            const count = bucket?.count ?? 0;
            const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
            return (
              <div key={stars} className="flex items-center gap-2 text-caption text-text-secondary">
                <span className="w-8 shrink-0">{stars}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-subtle">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
