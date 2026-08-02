<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Catalog\Models\ProductImage;
use Illuminate\Support\Facades\DB;

final readonly class AddProductImageAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes  media_id, position?, is_primary?
     */
    public function execute(Product $product, array $attributes, ?string $actorId): ProductImage
    {
        return DB::transaction(function () use ($product, $attributes, $actorId) {
            if ($attributes['is_primary'] ?? false) {
                $product->images()->update(['is_primary' => false]);
            }

            $image = $product->images()->create($attributes);

            $this->auditLogger->log(
                action: 'product_image.added',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                after: ['image_id' => $image->id, 'media_id' => $image->media_id, 'is_primary' => $image->is_primary],
            );

            return $image;
        });
    }
}
