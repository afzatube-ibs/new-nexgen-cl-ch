<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Http\Resources;

use App\Domains\Operations\Notifications\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Notification
 */
final class NotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'templateId' => $this->notification_template_id,
            'channel' => $this->channel,
            'recipient' => $this->recipient,
            'subject' => $this->subject,
            'status' => $this->status,
            'relatedType' => $this->related_type,
            'relatedId' => $this->related_id,
            'providerCode' => $this->provider_code,
            'attemptsCount' => $this->attempts_count,
            'maxAttempts' => $this->max_attempts,
            'nextRetryAt' => $this->next_retry_at?->toIso8601String(),
            'lastAttemptedAt' => $this->last_attempted_at?->toIso8601String(),
            'sentAt' => $this->sent_at?->toIso8601String(),
            'failedAt' => $this->failed_at?->toIso8601String(),
            'cancelledAt' => $this->cancelled_at?->toIso8601String(),
            'failureReason' => $this->failure_reason,
            'version' => $this->lock_version,
            'deliveryAttempts' => NotificationDeliveryAttemptResource::collection($this->whenLoaded('deliveryAttempts')),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
