import Link from 'next/link';
import { Text, cn } from '@nexgen/ui';

/**
 * Store Components library — Beta Milestone 2.5's own "Promotion Banner /
 * Campaign Strip" build item. A real, reusable component — deliberately
 * takes its `heading`/`href` as required props rather than fetching or
 * inventing a real campaign: no Marketing-module Promotion is composed
 * through the Gateway to the Storefront yet (`MERCHANT_CONVERSION_AUDIT.md`
 * names this), so every real call site today must pass genuinely generic,
 * non-specific copy (e.g. "New arrivals every week") — never a fabricated
 * discount percentage or an invented sale name.
 */
export interface PromotionBannerProps {
  heading: string;
  description?: string;
  href?: string;
  ctaLabel?: string;
  tone?: 'brand' | 'subtle';
  className?: string;
}

export function PromotionBanner({ heading, description, href, ctaLabel = 'Shop now', tone = 'subtle', className }: PromotionBannerProps) {
  const content = (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg px-6 py-4',
        tone === 'brand' ? 'bg-brand text-white' : 'border border-border bg-surface-subtle text-text-primary',
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <Text as="p" variant="body-strong" className={tone === 'brand' ? 'text-white' : undefined}>
          {heading}
        </Text>
        {description && (
          <Text as="p" variant="caption" className={tone === 'brand' ? 'text-white/80' : 'text-text-secondary'}>
            {description}
          </Text>
        )}
      </div>
      {href && (
        <span className={cn('shrink-0 text-body-strong underline-offset-4', tone === 'brand' ? 'text-white' : 'text-brand')}>{ctaLabel} →</span>
      )}
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2">
      {content}
    </Link>
  );
}
