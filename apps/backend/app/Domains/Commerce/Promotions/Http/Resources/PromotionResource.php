<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Resources;

use App\Domains\Commerce\Promotions\Models\Promotion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Promotion
 */
final class PromotionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'discountType' => $this->discount_type,
            'discountValue' => $this->discount_value,
            'currencyCode' => $this->currency_code,
            'buyXQuantity' => $this->buy_x_quantity,
            'buyXTargetType' => $this->buy_x_target_type,
            'buyXTargetId' => $this->buy_x_target_id,
            'getYQuantity' => $this->get_y_quantity,
            'getYTargetType' => $this->get_y_target_type,
            'getYTargetId' => $this->get_y_target_id,
            'getYDiscountPercentage' => $this->get_y_discount_percentage,
            'isStackable' => $this->is_stackable,
            'priority' => $this->priority,
            'requiresCoupon' => $this->requires_coupon,
            'startsAt' => $this->starts_at?->toIso8601String(),
            'endsAt' => $this->ends_at?->toIso8601String(),
            'usageLimitGlobal' => $this->usage_limit_global,
            'usageCountGlobal' => $this->usage_count_global,
            'usageLimitPerCustomer' => $this->usage_limit_per_customer,
            'status' => $this->status,
            'conditions' => PromotionConditionResource::collection($this->whenLoaded('conditions')),
            'coupons' => CouponResource::collection($this->whenLoaded('coupons')),
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
