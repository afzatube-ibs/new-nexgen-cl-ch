<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Resources;

use App\Domains\Commerce\Orders\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 */
final class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'orderNumber' => $this->order_number,
            'customerId' => $this->customer_id,
            'customerName' => $this->customer_name,
            'customerEmail' => $this->customer_email,
            'customerPhone' => $this->customer_phone,
            'currencyCode' => $this->currency_code,
            'subtotal' => $this->subtotal,
            'discountTotal' => $this->discount_total,
            'taxTotal' => $this->tax_total,
            'shippingTotal' => $this->shipping_total,
            'grandTotal' => $this->grand_total,
            'status' => $this->status,
            'placedAt' => $this->placed_at->toIso8601String(),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'addresses' => OrderAddressResource::collection($this->whenLoaded('addresses')),
            'discounts' => OrderDiscountResource::collection($this->whenLoaded('discounts')),
            'notes' => OrderNoteResource::collection($this->whenLoaded('notes')),
            'timelineEvents' => OrderTimelineEventResource::collection($this->whenLoaded('timelineEvents')),
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
