<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Events;

use App\Domains\Platform\Foundation\EventBus\DomainEvent;

/**
 * Published whenever Actions\RedeemPromotionAction successfully records a
 * redemption — the event planning/IMPLEMENTATION_MASTER_PLAN.md's
 * Promotions & Coupons entry names for every successful application,
 * whether the promotion was automatic or coupon-gated. Carries the
 * resolved discount amount actually applied, not every raw column of the
 * Promotion, per SECURITY:EVENT_SECURITY's "a subscriber receives only
 * what a publisher intended". The future Checkout and Orders modules are
 * this event's anticipated subscribers, per this module's Public
 * Contracts entry in the master plan.
 */
final class PromotionApplied extends DomainEvent
{
    public function __construct(
        public readonly string $promotionId,
        public readonly ?string $customerId,
        public readonly ?string $orderReference,
        public readonly string $discountAmount,
        public readonly string $currencyCode,
        ?string $correlationId = null,
    ) {
        parent::__construct($correlationId);
    }

    public function name(): string
    {
        return 'promotions.promotion.applied';
    }
}
