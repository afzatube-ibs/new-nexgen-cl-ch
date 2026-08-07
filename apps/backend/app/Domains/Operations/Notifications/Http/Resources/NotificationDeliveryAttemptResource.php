<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Http\Resources;

use App\Domains\Operations\Notifications\Models\NotificationDeliveryAttempt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin NotificationDeliveryAttempt
 */
final class NotificationDeliveryAttemptResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'providerCode' => $this->provider_code,
            'status' => $this->status,
            'providerReference' => $this->provider_reference,
            'failureReason' => $this->failure_reason,
            'occurredAt' => $this->occurred_at->toIso8601String(),
        ];
    }
}
