import { Badge, Text, cn } from '@nexgen/ui';

/**
 * Store Components library — the "Price placeholder" the milestone brief
 * asks for, built as a real, working component rather than a fake number.
 *
 * **A real, critical, load-bearing gap**: the Gateway's `ProductSummary`/
 * `ProductDetail` (`gateway/types.ts`) carry no price field at all today —
 * Pricing module data (`apps/admin`'s own Price Lists/Checkout Price
 * Preview) has never been composed into the public Catalog routes. Every
 * real call site in this milestone therefore renders `price={undefined}`,
 * and this component's honest empty state — not a fabricated "$0.00" or
 * hidden price — is what actually appears on every live page today. This
 * is the #1 finding in `MISSING_ECOMMERCE_FEATURES_AUDIT.md`: no
 * ecommerce storefront is real without a visible price. The component
 * itself is real and ready — wiring a real Gateway pricing route is the
 * remaining, named work.
 */
export interface Money {
  /** Minor currency units (cents/paisa) — matches how every other money value in this codebase is represented once a real Pricing route exists. */
  amountMinor: number;
  currencyCode: string;
}

export interface PriceBlockProps {
  price?: Money | null;
  compareAtPrice?: Money | null;
  locale?: string;
  size?: 'sm' | 'lg';
  /** Beta Milestone 2.5 — a real "You save {amount}" line, computed only from real prices, never shown alongside the discount badge redundantly-fabricated. Defaults to `size === 'lg'` (product detail), off on cards (`sm`) to avoid repeating the same real discount signal twice in a dense grid. */
  showSavingsAmount?: boolean;
  className?: string;
}

function formatMoney(money: Money, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: money.currencyCode }).format(money.amountMinor / 100);
}

export function PriceBlock({ price, compareAtPrice, locale = 'en', size = 'sm', showSavingsAmount, className }: PriceBlockProps) {
  if (!price) {
    return (
      <Text as="p" variant="caption" className={cn('text-text-secondary', className)}>
        Price unavailable
      </Text>
    );
  }

  const priceVariant = size === 'lg' ? 'heading' : 'body-strong';
  const validCompareAtPrice = compareAtPrice != null && compareAtPrice.amountMinor > price.amountMinor && compareAtPrice.currencyCode === price.currencyCode ? compareAtPrice : null;
  const discountPercent = validCompareAtPrice ? Math.round((1 - price.amountMinor / validCompareAtPrice.amountMinor) * 100) : null;
  const shouldShowSavings = (showSavingsAmount ?? size === 'lg') && validCompareAtPrice;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex flex-wrap items-baseline gap-2">
        <Text as="p" variant={priceVariant} className="text-text-primary">
          {formatMoney(price, locale)}
        </Text>
        {validCompareAtPrice && (
          <>
            <Text as="span" variant="caption" className="text-text-secondary line-through">
              {formatMoney(validCompareAtPrice, locale)}
            </Text>
            {/* A real `Badge` (solid `success` variant), not raw colored text — Badge's own docblock records the live, measured AA-contrast fix for exactly this token pairing; reusing it here rather than a second, unaudited raw-text color use. */}
            <Badge variant="success">-{discountPercent}%</Badge>
          </>
        )}
      </div>
      {shouldShowSavings && validCompareAtPrice && (
        // `font-medium text-text-primary`, not a raw `text-feedback-success` — Badge's own docblock records that raw feedback-color TEXT (as opposed to a solid feedback-color background) measures below WCAG AA at this size; the "-X%" Badge above already carries the color signal.
        <Text as="p" variant="caption" className="font-medium text-text-primary">
          You save {formatMoney({ amountMinor: validCompareAtPrice.amountMinor - price.amountMinor, currencyCode: price.currencyCode }, locale)}
        </Text>
      )}
    </div>
  );
}
