import Link from 'next/link';
import { Text } from '@nexgen/ui';

/**
 * Beta Milestone 2 — Store Components library (`CUSTOMER_EXPERIENCE_
 * ARCHITECTURE.md`'s own "reusable, not duplicated per page" bar). The
 * heading strip every Homepage section (Featured Categories, Trending,
 * Recently Added, ...) and Category page use — one real, consistent
 * "eyebrow + heading + optional view-all link" pattern instead of each
 * section hand-rolling its own heading markup.
 */
export interface SectionHeaderProps {
  eyebrow?: string;
  heading: string;
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}

export function SectionHeader({ eyebrow, heading, description, viewAllHref, viewAllLabel = 'View all' }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <Text as="p" variant="caption" className="uppercase tracking-wide text-text-secondary">
            {eyebrow}
          </Text>
        )}
        <Text as="h2" variant="heading">
          {heading}
        </Text>
        {description && (
          <Text as="p" variant="body" className="max-w-2xl text-text-secondary">
            {description}
          </Text>
        )}
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="shrink-0 text-body-strong text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-sm"
        >
          {viewAllLabel} →
        </Link>
      )}
    </div>
  );
}
