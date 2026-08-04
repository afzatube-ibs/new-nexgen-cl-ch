<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Support;

/**
 * One promotion that Actions\EvaluatePromotionsAction determined is
 * eligible and contributes to the cart's discount.
 */
final readonly class AppliedPromotion
{
    public function __construct(
        public string $promotionId,
        public string $name,
        public string $discountType,
        public string $discountAmount,
        public ?string $couponId = null,
    ) {}
}
