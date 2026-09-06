'use client';

import { cn } from '@nexgen/ui';
import { PAYMENT_METHOD_LABELS, type PaymentMethodId } from '../components/PaymentMethodBadge.js';

export interface PaymentMethodSelectorProps {
  methods: PaymentMethodId[];
  value: PaymentMethodId | null;
  onChange: (method: PaymentMethodId) => void;
  className?: string;
}

/**
 * Shopper payment selector. `methods` must come from the Gateway's real
 * available-payment-method endpoint; this component owns no capability or
 * credential assumptions of its own.
 */
export function PaymentMethodSelector({ methods, value, onChange, className }: PaymentMethodSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Payment method" className={cn('flex flex-col gap-2', className)}>
      {methods.map((method) => (
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
