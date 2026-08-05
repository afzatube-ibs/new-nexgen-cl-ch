<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Http\Resources;

use App\Domains\Operations\Fulfillment\Models\ShipmentItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ShipmentItem
 */
final class ShipmentItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'description' => $this->description,
            'quantity' => $this->quantity,
        ];
    }
}
