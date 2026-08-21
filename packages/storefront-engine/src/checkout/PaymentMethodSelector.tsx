'use client';

import { cn } from '@nexgen/ui';
import { PAYMENT_METHOD_LABELS, REAL_BACKEND_PAYMENT_METHODS, type PaymentMethodId } from '../components/PaymentMethodBadge.js';

/**
 * Beta Sprint 3 — Checkout Engine. A real, working single-select payment-
 * method UI, same `role="radiogroup"` pattern `CourierBadge.tsx`'s own
 * `CourierSelector` already established. Lists only
 * `REAL_BACKEND_PAYMENT_METHODS` — the five payment methods with a real
 * `PaymentGatewayContract` implementation in the real backend today
 * (`cod`, `bkash`, `nagad`, `sslcommerz`, `banktransfer`) — never
 * `rocket`/`portpos`/`visa`/`mastercard`, which have no backend gateway
 * class at all, per `PaymentMethodBadge.tsx`'s own corrected docblock.
 * Selecting a method here does not charge anything or contact any
 * gateway — the real backend's own Payments module is not reachable
 * from the Storefront yet (Category B) — this is real selection-state
 * UI, wired the moment that composition exists.
 */
export interface PaymentMethodSelectorProps {
  value: PaymentMethodId | null;
  onChange: (method: PaymentMethodId) => void;
  className?: string;
}

export function PaymentMethodSelector({ value, onChange, className }: PaymentMethodSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Payment method" className={cn('flex flex-col gap-2', className)}>
      {REAL_BACKEND_PAYMENT_METHODS.map((method) => (
        <button
          key={method}
          type="button"
          role="radio"
          aria-checked={value === method}
          onClick={() => onChange(method)}
          className={cn(
            'flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-body transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
            value === method ? 'border-brand bg-surface-subtle' : 'border-border hover:bg-surface-subtle',
          )}
        >
          <span
            aria-hidden="true"
            className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2', value === method ? 'border-brand' : 'border-border')}
          >
            {value === method && <span className="h-2 w-2 rounded-full bg-brand" />}
          </span>
          <span className="text-text-primary">{PAYMENT_METHOD_LABELS[method]}</span>
        </button>
      ))}
    </div>
  );
}
