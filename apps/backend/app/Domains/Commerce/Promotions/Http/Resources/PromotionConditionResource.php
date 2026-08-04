<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Resources;

use App\Domains\Commerce\Promotions\Models\PromotionCondition;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PromotionCondition
 */
final class PromotionConditionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'promotionId' => $this->promotion_id,
            'conditionType' => $this->condition_type,
            'referenceId' => $this->reference_id,
            'numericValue' => $this->numeric_value,
        ];
    }
}
