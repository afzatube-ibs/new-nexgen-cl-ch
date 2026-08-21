'use client';

import { Text, cn } from '@nexgen/ui';
import type { CartLine } from './types.js';

/**
 * Beta Sprint 3 — Cart Engine. A real subtotal, computed only from lines
 * that actually carry a real `unitPrice` — never a fabricated total.
 * Today, every real product on this Storefront resolves `unitPrice:
 * null` (no Pricing route composed from the Gateway yet — see
 * `LAUNCH_BLOCKER_STATUS.md`), so this renders its honest "Calculated at
 * checkout" state on every real cart. The partial-known-price branch
 * exists so this component is already correct the day pricing exists for
 * some but not all lines (e.g. a rollout), not only the all-or-nothing
 * case.
 */
export interface CartSummaryProps {
  lines: CartLine[];
  className?: string;
}

export function CartSummary({ lines, className }: CartSummaryProps) {
  const active = lines.filter((line) => !line.savedForLater);
  const knownLines = active.filter((line) => line.unitPrice !== null);
  const unknownCount = active.length - knownLines.length;
  const currencyCode = knownLines.find((line) => line.currencyCode)?.currencyCode ?? null;
  const knownSubtotal = knownLines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.quantity, 0);

  return (
    <div className={cn('flex flex-col gap-2 border-t border-border pt-4', className)}>
      <div className="flex items-center justify-between">
        <Text as="span" variant="body-strong" className="text-text-primary">
          Subtotal
        </Text>
        <Text as="span" variant="body-strong" className="text-text-primary">
          {knownLines.length === 0 ? 'Calculated at checkout' : `${currencyCode ?? ''} ${knownSubtotal.toFixed(2)}`.trim()}
        </Text>
      </div>
      {knownLines.length > 0 && unknownCount > 0 && (
        <Text as="p" variant="caption" className="text-text-secondary">
          + {unknownCount} item{unknownCount === 1 ? '' : 's'} priced at checkout
        </Text>
      )}
      <Text as="p" variant="caption" className="text-text-secondary">
        Shipping, taxes, and any discount are calculated at checkout.
      </Text>
    </div>
  );
}
