<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Resources;

use App\Domains\Commerce\Catalog\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductImage
 */
final class ProductImageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mediaId' => $this->media_id,
            'url' => $this->whenLoaded('media', fn () => $this->media?->url()),
            'altText' => $this->whenLoaded('media', fn () => $this->media?->alt_text),
            'position' => $this->position,
            'isPrimary' => $this->is_primary,
        ];
    }
}
