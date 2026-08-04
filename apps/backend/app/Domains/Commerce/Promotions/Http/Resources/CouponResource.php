<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Resources;

use App\Domains\Commerce\Promotions\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Coupon
 */
final class CouponResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'promotionId' => $this->promotion_id,
            'code' => $this->code,
            'usageLimitGlobal' => $this->usage_limit_global,
            'usageCountGlobal' => $this->usage_count_global,
            'status' => $this->status,
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
