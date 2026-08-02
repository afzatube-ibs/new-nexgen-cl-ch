<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Catalog\Models\ProductImage;
use Illuminate\Support\Facades\DB;

final readonly class UpdateProductImageAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Product $product, ProductImage $image, array $changes, ?string $actorId): ProductImage
    {
        return DB::transaction(function () use ($product, $image, $changes, $actorId) {
            if ($changes['is_primary'] ?? false) {
                $product->images()->where('id', '!=', $image->id)->update(['is_primary' => false]);
            }

            $before = $image->only(['position', 'is_primary']);
            $image->fill($changes)->save();
            $after = $image->only(['position', 'is_primary']);

            $this->auditLogger->log(
                action: 'product_image.updated',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                before: $before + ['image_id' => $image->id],
                after: $after + ['image_id' => $image->id],
            );

            return $image;
        });
    }
}
