import { Text, cn } from '@nexgen/ui';

/**
 * Beta Sprint 3 — Cart Engine. Sprint brief's own "Coupon placeholder,
 * Gift card placeholder, Reward placeholder" — built as one honest
 * statement rather than three fake input fields, because the real
 * backend's own architecture already answers where these belong:
 * `CheckoutSession.coupon_code` (`Checkout\Models\CheckoutSession`) is a
 * real, working field `Actions\ApplyCouponAction`/`ReviewCheckoutAction`
 * validate against Promotions' real `EvaluatePromotionsAction` — at
 * **Checkout**, not Cart. No gift-card or loyalty/reward module exists
 * anywhere in the real backend today (confirmed: no such domain under
 * `apps/backend/app/Domains`) — naming that honestly here, rather than a
 * fake "Apply" button on the Cart page that would either do nothing or
 * silently fail, is this component's whole purpose. A real coupon-entry
 * field belongs on the real Checkout page once Checkout is wired to a
 * live `CheckoutSession` (`COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md` §8).
 */
export function PromoCodePlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-md border border-dashed border-border bg-surface-subtle p-3', className)}>
      <Text as="p" variant="caption" className="text-text-secondary">
        Coupon codes, gift cards, and rewards are applied at checkout.
      </Text>
    </div>
  );
}
