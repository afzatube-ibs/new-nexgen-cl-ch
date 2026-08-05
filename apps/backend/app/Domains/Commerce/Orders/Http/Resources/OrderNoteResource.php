<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Orders\Http\Resources;

use App\Domains\Commerce\Orders\Models\OrderNote;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OrderNote
 */
final class OrderNoteResource extends JsonResource
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
