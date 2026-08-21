'use client';

import { useState, type FormEvent } from 'react';
import { Button, Input, Text } from '@nexgen/ui';

/**
 * Store Components library — Beta Milestone 2.6's own "Shipping
 * calculator" build item. Real, working form UI; honestly no real
 * shipping-rate route exists on the Gateway to call (Shipping's own real
 * Zones/Methods/Rates data lives in `apps/admin`, Phase 2.8, not yet
 * composed to the public Catalog/Product routes). Submitting shows an
 * honest "not available yet" result — the same pattern `Newsletter.tsx`
 * already established for a real form with no real backend behind it —
 * never a fabricated shipping cost.
 */
export function ShippingCalculator({ className }: { className?: string }) {
  const [result, setResult] = useState<'idle' | 'submitted'>('idle');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult('submitted');
  }

  return (
    <div className={className}>
      {result === 'submitted' ? (
        <Text as="p" variant="body" role="status" className="text-text-secondary">
          Shipping cost estimates aren&apos;t available yet — real delivery pricing is confirmed at checkout.
        </Text>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <label htmlFor="shipping-postcode" className="mb-1 block text-label text-text-primary">
              Delivery location
            </label>
            <Input id="shipping-postcode" placeholder="District or postcode" required />
          </div>
          <Button type="submit" variant="secondary">
            Calculate
          </Button>
        </form>
      )}
    </div>
  );
}
