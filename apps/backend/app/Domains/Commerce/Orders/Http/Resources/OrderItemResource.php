<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Resources;

use App\Domains\Commerce\Orders\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OrderItem
 */
final class OrderItemResource extends JsonResource
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
            'unitPrice' => $this->unit_price,
            'discountAmount' => $this->discount_amount,
            'taxAmount' => $this->tax_amount,
            'lineSubtotal' => $this->line_subtotal,
        ];
    }
}
