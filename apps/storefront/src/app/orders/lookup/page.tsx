import type { Metadata } from 'next';
import { PackageSearch } from 'lucide-react';
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
 *
 * **UX refinement pass (Sprint 5, post-wiring)** — a real page title
 * (`variant="heading"`, not the display-numeral size `display` is
 * reserved for per `@nexgen/tokens`'s own documented scale — a real,
 * pre-existing token misuse corrected here) with the same icon-circle
 * accent `/checkout/success` uses, for one consistent visual language
 * across this sprint's checkout-flow screens.
 */
export default function OrderLookupPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle text-brand">
          <PackageSearch className="size-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <Text as="h1" variant="heading">
            Track your order
          </Text>
          <Text as="p" variant="body" className="text-text-secondary">
            Enter your order number and email to check its status.
          </Text>
        </div>
      </div>
      <GuestOrderLookupForm />
    </div>
  );
}
