<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Http\Resources;

use App\Domains\Operations\Notifications\Channels\Contracts\NotificationProviderContract;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Wraps a Channels\Contracts\NotificationProviderContract implementation,
 * not an Eloquent model — providers are code-and-config-defined, mirrors
 * Shipping's own identically-reasoned ShippingProviderResource exactly.
 *
 * @mixin NotificationProviderContract
 */
final class NotificationProviderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->code(),
            'label' => $this->label(),
            'channel' => $this->channel(),
            'available' => $this->isAvailable(),
        ];
    }
}
