import type { Metadata } from 'next';
import { GuestOrderLookupForm } from '@nexgen/storefront-engine/client';
import { Text } from '@nexgen/ui';

export const metadata: Metadata = {
  title: 'Track your order',
};

/**
 * Beta Sprint 3 — Order Success Experience. `/orders/lookup` — a real,
 * live guest order-tracking entry point (`GuestOrderLookupForm`, see its
 * own docblock for exactly why this is wired live while
 * `OrderConfirmationSummary` is not). A Server Component page wrapper —
 * the form itself owns all client state.
 */
export default function OrderLookupPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Text as="h1" variant="display">
          Track your order
        </Text>
        <Text as="p" variant="body" className="text-text-secondary">
          Enter your order number and email to check its status.
        </Text>
      </div>
      <GuestOrderLookupForm />
    </div>
  );
}
