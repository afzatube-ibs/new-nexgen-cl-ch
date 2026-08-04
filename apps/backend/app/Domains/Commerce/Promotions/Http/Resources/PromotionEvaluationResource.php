<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Resources;

use App\Domains\Commerce\Promotions\Support\PromotionEvaluationResult;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Wraps a plain Support\PromotionEvaluationResult value object, not an
 * Eloquent model — mirrors Pricing's TaxCalculationResource exactly (see
 * that class's docblock for why a pure calculation has no persisted
 * aggregate to represent).
 *
 * @mixin PromotionEvaluationResult
 */
final class PromotionEvaluationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'appliedPromotions' => array_map(fn ($applied) => [
                'promotionId' => $applied->promotionId,
                'name' => $applied->name,
                'discountType' => $applied->discountType,
                'discountAmount' => $applied->discountAmount,
                'couponId' => $applied->couponId,
            ], $this->appliedPromotions),
            'totalDiscount' => $this->totalDiscount,
            'freeShipping' => $this->freeShipping,
        ];
    }
}
