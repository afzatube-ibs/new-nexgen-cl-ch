import { cn } from '@nexgen/ui';

/**
 * Store Components library — Trust Framework + Bangladesh Commerce Layer
 * "Payment methods" build items, covered by one shared, parameterized
 * component.
 *
 * **Corrected in Beta Sprint 3 — Commerce Engine (`COMMERCE_ENGINE_
 * ARCHITECTURE_REVIEW.md` §1.2)**: the previous docblock here claimed
 * "no payment gateway is actually integrated anywhere in this platform
 * yet" — re-verified against real source and found stale. The real
 * backend (`apps/backend/app/Domains/Commerce/Payments`) has real,
 * contract-driven gateway implementations for `cod`, `bkash`, `nagad`,
 * `sslcommerz`, and `banktransfer` (`Gateways/CodGateway.php`,
 * `BkashGateway.php`, `NagadGateway.php`, `SslcommerzGateway.php`,
 * `BankTransferGateway.php`) — genuinely real code, not fabricated. What
 * remains true, precisely: **no Storefront-reachable path to any of
 * them exists yet** (every Payments route is staff-`auth:sanctum`-gated,
 * same Category-B gap as Checkout) — so still no real brand logo (which
 * would imply a live, shopper-usable integration), still a plain, honest
 * text label. `rocket`/`portpos`/`visa`/`mastercard` have no real backend
 * gateway class at all — kept here as named, architecture-only future
 * extension points (Bangladesh Commerce Layer, Milestone 2.6's own
 * "never hardcode providers" instruction), never presented as available
 * on a real Checkout selector (`checkout/PaymentMethodSelector.tsx`
 * lists only the five with a real backend gateway behind them).
 */
export type PaymentMethodId = 'cod' | 'visa' | 'mastercard' | 'bkash' | 'nagad' | 'rocket' | 'sslcommerz' | 'portpos' | 'banktransfer';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> = {
  cod: 'Cash on Delivery',
  visa: 'Visa',
  mastercard: 'Mastercard',
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  sslcommerz: 'SSLCommerz',
  portpos: 'PortPos',
  banktransfer: 'Bank Transfer',
};

/** The `PaymentMethodId`s with a real backend `PaymentGatewayContract` implementation today — see this file's own docblock. */
export const REAL_BACKEND_PAYMENT_METHODS: PaymentMethodId[] = ['cod', 'bkash', 'nagad', 'sslcommerz', 'banktransfer'];

export function PaymentMethodBadge({ method, className }: { method: PaymentMethodId; className?: string }) {
  return (
    <span className={cn('rounded-md border border-border bg-surface px-2.5 py-1 text-caption font-medium text-text-primary', className)}>
      {PAYMENT_METHOD_LABELS[method]}
    </span>
  );
}

export interface PaymentMethodsRowProps {
  methods: PaymentMethodId[];
  className?: string;
}

/** Renders nothing when `methods` is empty — this component never asserts a payment method is accepted unless the calling page explicitly, honestly says so. */
export function PaymentMethodsRow({ methods, className }: PaymentMethodsRowProps) {
  if (methods.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)} aria-label="Accepted payment methods">
      {methods.map((method) => (
        <PaymentMethodBadge key={method} method={method} />
      ))}
    </div>
  );
}
