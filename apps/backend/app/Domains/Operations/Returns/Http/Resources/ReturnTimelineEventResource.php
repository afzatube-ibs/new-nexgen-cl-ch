<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Resources;

use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ReturnTimelineEvent
 */
final class ReturnTimelineEventResource extends JsonResource
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
