<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Http\Resources;

use App\Domains\Operations\Fulfillment\Models\ShipmentTimelineEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ShipmentTimelineEvent
 */
final class ShipmentTimelineEventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'eventType' => $this->event_type,
            'description' => $this->description,
            'occurredAt' => $this->occurred_at->toIso8601String(),
        ];
    }
}
