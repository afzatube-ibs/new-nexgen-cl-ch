import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Text } from '@nexgen/ui';

/**
 * Shared merchandising heading used by Homepage, category, PDP review and
 * recommendation surfaces. Styling adds hierarchy only; all copy and links
 * remain caller-owned.
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
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
      <div className="flex max-w-3xl flex-col gap-1.5">
        {eyebrow && (
          <Text as="p" variant="caption" className="font-medium uppercase tracking-[0.14em] text-brand">
            {eyebrow}
          </Text>
        )}
        <Text as="h2" variant="heading" className="text-balance">
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
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-caption font-medium text-text-primary transition-colors hover:border-brand/30 hover:bg-brand/5 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          {viewAllLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
