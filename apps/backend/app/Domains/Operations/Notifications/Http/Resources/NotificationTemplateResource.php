<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Http\Resources;

use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin NotificationTemplate
 */
final class NotificationTemplateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'channel' => $this->channel,
            'locale' => $this->locale,
            'subject' => $this->subject,
            'body' => $this->body,
            'isActive' => $this->is_active,
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
