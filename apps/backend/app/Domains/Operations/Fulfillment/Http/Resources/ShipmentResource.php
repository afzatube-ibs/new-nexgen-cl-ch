<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Http\Resources;

use App\Domains\Operations\Fulfillment\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Shipment
 */
final class ShipmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'orderId' => $this->order_id,
            'orderNumber' => $this->order_number,
            'customerId' => $this->customer_id,
            'grandTotal' => $this->grand_total,
            'currencyCode' => $this->currency_code,
            'shippingMethodId' => $this->shipping_method_id,
            'courierProviderCode' => $this->courier_provider_code,
            'courierConsignmentId' => $this->courier_consignment_id,
            'trackingNumber' => $this->tracking_number,
            'labelUrl' => $this->label_url,
            'destination' => [
                'recipientName' => $this->destination_recipient_name,
                'phone' => $this->destination_phone,
                'addressLine1' => $this->destination_address_line1,
                'addressLine2' => $this->destination_address_line2,
                'city' => $this->destination_city,
                'region' => $this->destination_region,
                'postalCode' => $this->destination_postal_code,
                'countryCode' => $this->destination_country_code,
            ],
            'weightGrams' => $this->weight_grams,
            'status' => $this->status,
            'failureReason' => $this->failure_reason,
            'pickedAt' => $this->picked_at?->toIso8601String(),
            'packedAt' => $this->packed_at?->toIso8601String(),
            'dispatchedAt' => $this->dispatched_at?->toIso8601String(),
            'deliveredAt' => $this->delivered_at?->toIso8601String(),
            'version' => $this->lock_version,
            'items' => ShipmentItemResource::collection($this->whenLoaded('items')),
            'timeline' => ShipmentTimelineEventResource::collection($this->whenLoaded('timelineEvents')),
            'notes' => ShipmentNoteResource::collection($this->whenLoaded('notes')),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
