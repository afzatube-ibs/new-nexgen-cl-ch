'use client';

import { cn } from '@nexgen/ui';

/**
 * Store Components library — Trust Framework + Bangladesh Commerce Layer
 * "Courier methods" build items. Same reasoning as `PaymentMethodBadge.tsx`:
 * no courier (Pathao, Steadfast, RedX, Paperfly, Sundarban) is actually
 * integrated — no Shipping-to-Storefront composition exists yet
 * (`MISSING_ECOMMERCE_FEATURES_AUDIT.md` §4). Plain text labels, never a
 * fabricated brand mark or a real-looking tracking-number format.
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
    <span className={cn('rounded-md border border-border bg-surface px-2.5 py-1 text-caption font-medium text-text-primary', className)}>
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
