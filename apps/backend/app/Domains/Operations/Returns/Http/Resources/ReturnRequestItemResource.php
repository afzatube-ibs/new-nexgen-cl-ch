<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Resources;

use App\Domains\Operations\Returns\Models\ReturnRequestItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ReturnRequestItem
 */
final class ReturnRequestItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'description' => $this->description,
            'quantity' => $this->quantity,
        ];
    }
}
