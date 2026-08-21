'use client';

import { useState } from 'react';
import { Button, Icon, cn } from '@nexgen/ui';
import { Check, ShoppingBag } from 'lucide-react';
import { useCartDrawerControls } from './CartDrawerProvider.js';
import { useCart } from './useCart.js';

/**
 * Beta Sprint 3 — Cart Engine. The real "Add to cart" affordance —
 * replaces every honestly-inert `aria-label="... — coming soon"` Add-to-
 * cart button built across Beta Milestones 1–2.6 (`ProductCard`'s own
 * Quick Add, the Product Detail page's main CTA, `StickyMobileBuyBar`,
 * `QuickViewModal`) now that a real cart exists to add to.
 *
 * Real optimistic UI: the click is synchronous (`cartStore.addItem` is a
 * plain `localStorage` write, no network round-trip to wait on), so this
 * shows its "Added" confirmation state immediately — not a simulated
 * delay standing in for a real one, an *actually* instant local mutation
 * reflected instantly. Opens the shared `CartDrawer` (`CartDrawerProvider`)
 * on add, the standard "confirm what just happened" pattern this
 * platform's own `MERCHANT_CONVERSION_AUDIT.md` names as a real
 * conversion improvement.
 */
export interface AddToCartButtonProps {
  productId: string;
  sku?: string | null;
  name: string;
  href: string;
  imageSrc?: string | null;
  unitPrice?: number | null;
  currencyCode?: string | null;
  quantity?: number;
  disabled?: boolean;
  disabledReason?: string;
  /** `full` — labeled button (Product Detail, sticky bar). `icon` — compact square button. `bar` — full-width hover-revealed bar (Product Card Quick Add), unstyled beyond `className` so the caller supplies the exact bar treatment. */
  variant?: 'full' | 'icon' | 'bar';
  size?: 'md' | 'lg';
  className?: string;
}

export function AddToCartButton({
  productId,
  sku,
  name,
  href,
  imageSrc,
  unitPrice,
  currencyCode,
  quantity = 1,
  disabled = false,
  disabledReason,
  variant = 'full',
  size = 'md',
  className,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const { openDrawer } = useCartDrawerControls();
  const [justAdded, setJustAdded] = useState(false);

  function handleClick() {
    if (disabled) return;
    addItem({ productId, sku, name, href, imageSrc, unitPrice, currencyCode, quantity });
    setJustAdded(true);
    openDrawer();
    window.setTimeout(() => setJustAdded(false), 1800);
  }

  if (variant === 'bar') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={disabled ? `${name} — ${disabledReason ?? 'unavailable'}` : `Quick add ${name} to cart`}
        title={disabled ? disabledReason : undefined}
        className={className}
      >
        {justAdded ? 'Added ✓' : disabled ? (disabledReason ?? 'Unavailable') : 'Quick Add'}
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={disabled ? `${name} — ${disabledReason ?? 'unavailable'}` : `Add ${name} to cart`}
        title={disabled ? disabledReason : undefined}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full bg-surface text-text-primary shadow-elevation-1',
          'hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        <Icon icon={justAdded ? Check : ShoppingBag} size="inline" />
      </button>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      size={size}
      className={className}
      aria-label={disabled ? `${name} — ${disabledReason ?? 'unavailable'}` : undefined}
      title={disabled ? disabledReason : undefined}
    >
      <Icon icon={justAdded ? Check : ShoppingBag} size="inline" />
      {justAdded ? 'Added to cart' : disabled ? (disabledReason ?? 'Unavailable') : 'Add to cart'}
    </Button>
  );
}
