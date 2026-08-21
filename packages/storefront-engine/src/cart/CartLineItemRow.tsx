'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Icon, Text, cn } from '@nexgen/ui';
import { Minus, Plus, X } from 'lucide-react';
import type { CartLine } from './types.js';

/**
 * Beta Sprint 3 — Cart Engine. One real cart line: image, name, a real
 * working quantity stepper, remove, and — for an active (not saved-for-
 * later) line — a real "Save for later" action. Price is `PriceBlock`'s
 * own honest pattern applied here: `unitPrice === null` (every real
 * product today) renders "Price unavailable", never a fabricated number
 * or a silently blank space.
 */
export interface CartLineItemRowProps {
  line: CartLine;
  onQuantityChange: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
  onSaveForLater?: (lineId: string) => void;
  onMoveToCart?: (lineId: string) => void;
  className?: string;
}

function formatPrice(unitPrice: number | null, currencyCode: string | null): string {
  if (unitPrice === null) return 'Price unavailable';
  return currencyCode ? `${currencyCode} ${unitPrice.toFixed(2)}` : unitPrice.toFixed(2);
}

export function CartLineItemRow({ line, onQuantityChange, onRemove, onSaveForLater, onMoveToCart, className }: CartLineItemRowProps) {
  return (
    <div className={cn('flex gap-3 py-4', className)}>
      <Link href={line.href} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
        {line.imageSrc ? (
          <Image src={line.imageSrc} alt={line.name} fill sizes="80px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-caption text-text-secondary">No image</div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <Link href={line.href} className="line-clamp-2 text-body-strong text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-sm">
          {line.name}
        </Link>
        {line.sku && <Text as="p" variant="caption" className="text-text-secondary">SKU: {line.sku}</Text>}
        <Text as="p" variant="body-strong" className="text-text-primary">
          {formatPrice(line.unitPrice, line.currencyCode)}
        </Text>

        <div className="mt-1 flex items-center gap-3">
          {!line.savedForLater && (
            <div className="flex items-center rounded-md border border-border" role="group" aria-label={`Quantity for ${line.name}`}>
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => onQuantityChange(line.id, line.quantity - 1)}
                className="flex h-8 w-8 items-center justify-center text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <Icon icon={Minus} size="inline" />
              </button>
              <span className="w-8 text-center text-body text-text-primary" aria-live="polite">
                {line.quantity}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => onQuantityChange(line.id, line.quantity + 1)}
                className="flex h-8 w-8 items-center justify-center text-text-primary hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <Icon icon={Plus} size="inline" />
              </button>
            </div>
          )}

          {line.savedForLater && onMoveToCart ? (
            <button
              type="button"
              onClick={() => onMoveToCart(line.id)}
              className="text-caption font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-sm"
            >
              Move to cart
            </button>
          ) : (
            onSaveForLater && (
              <button
                type="button"
                onClick={() => onSaveForLater(line.id)}
                className="text-caption font-medium text-text-secondary underline-offset-4 hover:text-text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-sm"
              >
                Save for later
              </button>
            )
          )}
        </div>
      </div>

      <button
        type="button"
        aria-label={`Remove ${line.name} from cart`}
        onClick={() => onRemove(line.id)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <Icon icon={X} size="inline" />
      </button>
    </div>
  );
}
