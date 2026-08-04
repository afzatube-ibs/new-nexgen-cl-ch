<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Actions;

use App\Domains\Commerce\Promotions\Audit\AuditLogger;
use App\Domains\Commerce\Promotions\Events\CouponRedeemed;
use App\Domains\Commerce\Promotions\Events\PromotionApplied;
use App\Domains\Commerce\Promotions\Exceptions\PromotionNotEligibleException;
use App\Domains\Commerce\Promotions\Exceptions\UsageLimitExceededException;
use App\Domains\Commerce\Promotions\Models\Coupon;
use App\Domains\Commerce\Promotions\Models\Promotion;
use App\Domains\Commerce\Promotions\Models\PromotionRedemption;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * Records a redemption — the mutating counterpart to Actions\
 * EvaluatePromotionsAction, called once a cart actually becomes an order
 * (or whatever finalization event a future Checkout module defines). One
 * call per promotion being redeemed; a stacked cart redeeming several
 * promotions at once calls this once per promotion.
 *
 * Re-validates eligibility and every usage limit against a row locked with
 * `lockForUpdate()` — never a client-supplied `expected_version` —
 * mirroring Inventory's ReserveStockAction exactly (see that class's
 * docblock): this is a system-initiated write with no prior client read to
 * version against, so the concurrency control is the database row lock
 * serializing concurrent redemption attempts, rather than optimistic
 * locking's read-then-conditional-write shape. `lock_version` still
 * increments on save (HasOptimisticLocking's normal `updating` hook),
 * preserving the invariant that every mutation still advances the
 * aggregate's version for any other caller reading it.
 *
 * Exactly one aggregate — Promotion for an automatic promotion, or Coupon
 * for a coupon-gated one — is locked and mutated per call, per the
 * promotions migration's docblock's reasoning for why usage counting never
 * spans both at once.
 */
final readonly class RedeemPromotionAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(
        string $promotionId,
        ?string $couponCode,
        ?string $customerId,
        ?string $orderReference,
        string $discountAmount,
        string $currencyCode,
        ?string $actorId,
    ): PromotionRedemption {
        return DB::transaction(function () use (
            $promotionId, $couponCode, $customerId, $orderReference, $discountAmount, $currencyCode, $actorId
        ) {
            $promotion = Promotion::query()->lockForUpdate()->findOrFail($promotionId);

            if (! $promotion->isActive() || ! $promotion->isWithinSchedule()) {
                throw new PromotionNotEligibleException("Promotion [{$promotion->id}] is not currently redeemable.");
            }

            $coupon = null;

            if ($promotion->requires_coupon) {
                if ($couponCode === null || $couponCode === '') {
                    throw new PromotionNotEligibleException("Promotion [{$promotion->id}] requires a coupon code.");
                }

                $coupon = Coupon::query()
                    ->lockForUpdate()
                    ->where('promotion_id', $promotion->id)
                    ->where('code', strtoupper($couponCode))
                    ->first();

                if ($coupon === null || ! $coupon->isActive()) {
                    throw new PromotionNotEligibleException("No active coupon matching that code exists for promotion [{$promotion->id}].");
                }

                if ($coupon->hasReachedGlobalUsageLimit()) {
                    throw new UsageLimitExceededException(Coupon::class, $coupon->id, 'global usage limit reached.');
                }
            } elseif ($promotion->hasReachedGlobalUsageLimit()) {
                throw new UsageLimitExceededException(Promotion::class, $promotion->id, 'global usage limit reached.');
            }

            if ($promotion->usage_limit_per_customer !== null && $customerId !== null) {
                $customerRedemptions = PromotionRedemption::query()
                    ->where('promotion_id', $promotion->id)
                    ->where('customer_id', $customerId)
                    ->count();

                if ($customerRedemptions >= $promotion->usage_limit_per_customer) {
                    throw new UsageLimitExceededException(Promotion::class, $promotion->id, 'per-customer usage limit reached.');
                }
            }

            if ($coupon !== null) {
                $coupon->usage_count_global++;
                $coupon->save();
            } else {
                $promotion->usage_count_global++;
                $promotion->save();
            }

            $redemption = PromotionRedemption::query()->create([
                'promotion_id' => $promotion->id,
                'coupon_id' => $coupon?->id,
                'customer_id' => $customerId,
                'order_reference' => $orderReference,
                'discount_amount' => $discountAmount,
                'currency_code' => $currencyCode,
                'redeemed_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'promotion.redeemed',
                actorId: $actorId,
                targetType: Promotion::class,
                targetId: $promotion->id,
                after: [
                    'redemption_id' => $redemption->id,
                    'coupon_id' => $coupon?->id,
                    'customer_id' => $customerId,
                    'discount_amount' => $discountAmount,
                ],
            );

            $this->eventBus->publish(new PromotionApplied(
                promotionId: $promotion->id,
                customerId: $customerId,
                orderReference: $orderReference,
                discountAmount: $discountAmount,
                currencyCode: $currencyCode,
            ));

            if ($coupon !== null) {
                $this->eventBus->publish(new CouponRedeemed(
                    couponId: $coupon->id,
                    code: $coupon->code,
                    promotionId: $promotion->id,
                    customerId: $customerId,
                ));
            }

            return $redemption;
        });
    }
}
