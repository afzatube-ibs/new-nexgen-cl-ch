<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Resources;

use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
final class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'brandId' => $this->brand_id,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'shortDescription' => $this->short_description,
            'productType' => $this->product_type,
            'weightGrams' => $this->weight_grams,
            'status' => $this->status,
            'visibility' => $this->visibility,
            'metaTitle' => $this->meta_title,
            'metaDescription' => $this->meta_description,
            'metaKeywords' => $this->meta_keywords,
            'metadata' => $this->metadata,
            'publishedAt' => $this->published_at?->toIso8601String(),
            'categories' => CategoryResource::collection($this->whenLoaded('categories')),
            'collections' => CollectionResource::collection($this->whenLoaded('collections')),
            'tags' => TagResource::collection($this->whenLoaded('tags')),
            'images' => ProductImageResource::collection($this->whenLoaded('images')),
            'variants' => ProductVariantResource::collection($this->whenLoaded('variants')),
            'attributeValues' => ProductAttributeValueResource::collection($this->whenLoaded('attributeValues')),
            'relationships' => ProductRelationshipResource::collection($this->whenLoaded('relationships')),
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
