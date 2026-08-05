<?php

declare(strict_types=1);

namespace App\Domains\Operations\Fulfillment\Http\Resources;

use App\Domains\Operations\Fulfillment\Models\ShipmentNote;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ShipmentNote
 */
final class ShipmentNoteResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'authorId' => $this->author_id,
            'body' => $this->body,
            'isCustomerVisible' => $this->is_customer_visible,
            'createdAt' => $this->created_at->toIso8601String(),
        ];
    }
}
