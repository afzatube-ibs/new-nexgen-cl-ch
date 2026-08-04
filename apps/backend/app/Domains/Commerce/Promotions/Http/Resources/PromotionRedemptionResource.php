<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Resources;

use App\Domains\Commerce\Promotions\Models\PromotionRedemption;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PromotionRedemption
 */
final class PromotionRedemptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'promotionId' => $this->promotion_id,
            'couponId' => $this->coupon_id,
            'customerId' => $this->customer_id,
            'orderReference' => $this->order_reference,
            'discountAmount' => $this->discount_amount,
            'currencyCode' => $this->currency_code,
            'redeemedAt' => $this->redeemed_at->toIso8601String(),
        ];
    }
}
