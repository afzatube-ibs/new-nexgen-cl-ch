<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Resources;

use App\Domains\Commerce\Orders\Models\OrderDiscount;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OrderDiscount
 */
final class OrderDiscountResource extends JsonResource
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
            'label' => $this->label,
            'amount' => $this->amount,
        ];
    }
}
