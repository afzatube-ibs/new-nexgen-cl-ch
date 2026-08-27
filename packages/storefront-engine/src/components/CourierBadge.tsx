'use client';

import { Truck } from 'lucide-react';
import { Icon, cn } from '@nexgen/ui';

/**
 * Store Components library — Trust Framework + Bangladesh Commerce Layer
 * "Courier methods" build items. Same reasoning as `PaymentMethodBadge.tsx`:
 * no courier (Pathao, Steadfast, RedX, Paperfly, Sundarban) is actually
 * integrated — no Shipping-to-Storefront composition exists yet
 * (`MISSING_ECOMMERCE_FEATURES_AUDIT.md` §4). Plain text labels, never a
 * fabricated brand mark or a real-looking tracking-number format.
 *
 * **Experience Polish Sprint 1, Pack 5.5** — `CourierBadge` (the
 * read-only trust-row badge, used on the PDP and in `StoreFooter`) now
 * leads with one shared, generic `Truck` icon — every courier is
 * functionally the same "delivery partner" category, so one honest,
 * non-brand-specific icon applies to all of them, never a per-courier
 * mark this platform has no real logo asset for. `CourierSelector` below
 * (the real, interactive Checkout courier-preference control) is
 * untouched — this pass only refines the passive badge.
 */
export type CourierId = 'pathao' | 'steadfast' | 'redx' | 'paperfly' | 'sundarban';

export const COURIER_LABELS: Record<CourierId, string> = {
  pathao: 'Pathao',
  steadfast: 'Steadfast',
  redx: 'RedX',
  paperfly: 'Paperfly',
  sundarban: 'Sundarban Courier',
};

export function CourierBadge({ courier, className }: { courier: CourierId; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-subtle px-2.5 py-1.5 text-caption font-medium text-text-primary',
        className,
      )}
    >
      <Icon icon={Truck} size="inline" className="text-text-secondary" />
      {COURIER_LABELS[courier]}
    </span>
  );
}

export interface CourierSelectorProps {
  couriers: CourierId[];
  value?: CourierId;
  onChange?: (courier: CourierId) => void;
  className?: string;
}

/**
 * Real, working single-select UI over a real courier list — the actual
 * dispatch decision (which courier ships a given order) is a real
 * Shipping-module capability (`apps/admin`'s own Shipping/Fulfillment,
 * frozen Phase 2.8); this component is the Storefront-side selection UI
 * only, honestly disconnected from any live dispatch action until a
 * Storefront-facing courier-choice capability is actually scoped.
 */
export function CourierSelector({ couriers, value, onChange, className }: CourierSelectorProps) {
  if (couriers.length === 0) return null;
  return (
    <div role="radiogroup" aria-label="Choose a courier" className={cn('flex flex-wrap gap-2', className)}>
      {couriers.map((courier) => (
        <button
          key={courier}
          type="button"
          role="radio"
          aria-checked={value === courier}
          onClick={() => onChange?.(courier)}
          className={cn(
            'rounded-md border px-3 py-1.5 text-body transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
            value === courier ? 'border-brand bg-brand text-white' : 'border-border text-text-primary hover:bg-surface-subtle',
          )}
        >
          {COURIER_LABELS[courier]}
        </button>
      ))}
    </div>
  );
}
