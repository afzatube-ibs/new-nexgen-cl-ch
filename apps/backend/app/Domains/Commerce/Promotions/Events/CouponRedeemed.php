<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published in addition to PromotionApplied whenever the redeemed
 * promotion was coupon-gated — the second event planning/IMPLEMENTATION_
 * MASTER_PLAN.md's Promotions & Coupons entry names. Carries the coupon's
 * own identity and code so a subscriber can track code-specific redemption
 * activity (e.g. a future Marketing & Automation module reporting on
 * campaign-code performance) without needing to join back through
 * Promotion.
 */
final class CouponRedeemed extends DomainEvent
{
    public function __construct(
        public readonly string $couponId,
        public readonly string $code,
        public readonly string $promotionId,
        public readonly ?string $customerId,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'promotions.coupon.redeemed';
    }
}
