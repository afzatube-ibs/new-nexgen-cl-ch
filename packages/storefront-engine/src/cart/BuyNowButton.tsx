'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nexgen/ui';
import { useCart } from './useCart.js';

/**
 * Beta Experience Pack 1 — Product Detail Buy Box v3's own real "Buy Now"
 * CTA. Adds a real line to the real `localStorage` cart (the identical,
 * already-real `cartStore.addItem` `AddToCartButton` itself calls — no
 * new cart mechanism), then navigates straight to the real, already-built
 * `/checkout` (Beta Sprint 5) — never a new checkout path, never bypassing
 * real validation. Deliberately built here, not as a `ProductCard` grid
 * action: a shopper clicking "Buy Now" has already committed to this one
 * product, exactly the Product Detail page's own context — a dense grid
 * card's job stays Quick Add (`ProductCard.tsx`'s own v3 docblock).
 *
 * **Experience Polish Sprint 1, Pack 5 (item 5.1)** — renders with
 * `Button`'s own default `primary` variant (previously hardcoded to
 * `secondary`), making Buy Now the visually dominant purchase action
 * everywhere it appears (the Buy Box, and `StickyMobileBuyBar` per item
 * 5.5) — the real fix for the "two equal-weight buttons" decision-friction
 * finding in `EXPERIENCE_POLISH_SPRINT_1_AUDIT.md` item 19. The paired
 * `AddToCartButton` at each real call site now passes `emphasis="secondary"`
 * so exactly one of the two reads as primary, never both.
 *
 * **Experience Polish Sprint 1, Pack 5.5** — added an optional `size`
 * prop (default `'md'`, this component's original, unchanged height
 * everywhere it isn't given this prop — `StickyMobileBuyBar`'s own usage
 * stays exactly as it was). A real, previously-unnoticed mismatch: the
 * desktop Buy Box paired this button (always `md`, 36px tall) with an
 * `AddToCartButton` explicitly sized `lg` (40px) — two buttons in the
 * same row, two different heights. The Buy Box now passes `size="lg"`
 * here too, so both real purchase actions sit at the same height, a
 * small but real "does this look like it was actually designed" signal.
 */
export interface BuyNowButtonProps {
  productId: string;
  sku?: string | null;
  name: string;
  href: string;
  imageSrc?: string | null;
  /** Milestone 2 — real major-unit price (e.g. `2490`), matching `AddToCartButton`'s own `unitPrice` convention exactly (never minor units) — `undefined`/`null` renders the identical honest "priceless" cart line this component always has when no real price is composed yet. */
  unitPrice?: number | null;
  currencyCode?: string | null;
  disabled?: boolean;
  disabledReason?: string;
  size?: 'md' | 'lg';
  className?: string;
}

export function BuyNowButton({ productId, sku, name, href, imageSrc, unitPrice, currencyCode, disabled = false, disabledReason, size = 'md', className }: BuyNowButtonProps) {
  const { addItem } = useCart();
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  function handleClick() {
    if (disabled) return;
    addItem({ productId, sku, name, href, imageSrc, unitPrice: unitPrice ?? null, currencyCode: currencyCode ?? null, quantity: 1 });
    setNavigating(true);
    router.push('/checkout');
  }

  return (
    <Button
      type="button"
      size={size}
      onClick={handleClick}
      disabled={disabled}
      loading={navigating}
      className={className}
      aria-label={disabled ? `${name} — ${disabledReason ?? 'unavailable'}` : 'Buy now'}
      title={disabled ? disabledReason : undefined}
    >
      {disabled ? (disabledReason ?? 'Unavailable') : 'Buy now'}
    </Button>
  );
}
