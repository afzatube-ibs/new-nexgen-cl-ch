<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Http\Resources;

use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CheckoutSession
 */
final class CheckoutSessionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customerId' => $this->customer_id,
            'guestEmail' => $this->guest_email,
            'guestName' => $this->guest_name,
            'currencyCode' => $this->currency_code,
            'billingAddress' => $this->billing_address,
            'shippingAddress' => $this->shipping_address,
            'shippingOptionId' => $this->shipping_option_id,
            'shippingOptionLabel' => $this->shipping_option_label,
            'shippingTotal' => $this->shipping_total,
            'couponCode' => $this->coupon_code,
            'subtotal' => $this->subtotal,
            'discountTotal' => $this->discount_total,
            'taxTotal' => $this->tax_total,
            'grandTotal' => $this->grand_total,
            'status' => $this->status,
            'orderId' => $this->order_id,
            'expiresAt' => $this->expires_at->toIso8601String(),
            'items' => CheckoutItemResource::collection($this->whenLoaded('items')),
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
