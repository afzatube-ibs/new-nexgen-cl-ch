<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Resources;

use App\Domains\Commerce\Checkout\Models\CheckoutItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CheckoutItem
 */
final class CheckoutItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'productId' => $this->product_id,
            'sku' => $this->sku,
            'productName' => $this->product_name,
            'quantity' => $this->quantity,
            'taxClassId' => $this->tax_class_id,
            'unitPrice' => $this->unit_price,
            'taxAmount' => $this->tax_amount,
        ];
    }
}
