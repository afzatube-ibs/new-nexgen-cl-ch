<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Resources;

use App\Domains\Operations\Returns\Models\ReturnNote;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ReturnNote
 */
final class ReturnNoteResource extends JsonResource
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
