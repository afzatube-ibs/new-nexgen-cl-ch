import { Icon, Text, cn } from '@nexgen/ui';
import { Truck, PackageCheck } from 'lucide-react';

/**
 * Store Components library — Beta Milestone 2.6's own "Shipping
 * Presentation" build item: `DeliveryEstimate`, `ShippingBadge`, and
 * `DeliveryPromise` — three small, real, reusable pieces sharing one
 * file since each is a few lines. All three require the calling page to
 * pass real data; none renders a guess. No Shipping-rate/delivery-window
 * composition route exists from the Gateway to the Storefront yet
 * (`MISSING_ECOMMERCE_FEATURES_AUDIT.md` §4.5) — real Shipping-module
 * data exists in `apps/admin` (Phase 2.8, frozen) but is not yet exposed
 * to the public Catalog/Product routes this Storefront reads from.
 */
export function DeliveryEstimate({ estimate, className }: { estimate?: string | null; className?: string }) {
  if (!estimate) return null;
  return (
    <div className={cn('flex items-center gap-2 text-body text-text-primary', className)}>
      <Icon icon={Truck} size="inline" className="text-text-secondary" />
      <span>{estimate}</span>
    </div>
  );
}

export function ShippingBadge({ label, className }: { label?: string | null; className?: string }) {
  if (!label) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-caption font-medium text-text-primary', className)}>
      <Icon icon={PackageCheck} size="inline" />
      {label}
    </span>
  );
}

export function DeliveryPromise({ date, className }: { date?: string | null; className?: string }) {
  if (!date) return null;
  return (
    <Text as="p" variant="body-strong" className={cn('text-text-primary', className)}>
      Get it by {date}
    </Text>
  );
}
