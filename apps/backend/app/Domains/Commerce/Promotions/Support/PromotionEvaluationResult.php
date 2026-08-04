<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Support;

/**
 * The output of Actions\EvaluatePromotionsAction — "Discount calculation
 * service" made concrete. `freeShipping` signals eligibility only; this
 * module never calculates or owns a shipping cost (that is a future
 * Shipping module's responsibility) — it just tells the caller a
 * free-shipping promotion applied.
 */
final readonly class PromotionEvaluationResult
{
    /**
     * @param  list<AppliedPromotion>  $appliedPromotions
     */
    public function __construct(
        public array $appliedPromotions,
        public string $totalDiscount,
        public bool $freeShipping,
    ) {}
}
