<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Resources;

use App\Domains\Commerce\Orders\Models\OrderTimelineEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OrderTimelineEvent
 */
final class OrderTimelineEventResource extends JsonResource
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
