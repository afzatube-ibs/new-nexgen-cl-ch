<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Catalog\Models\ProductImage;
use Illuminate\Support\Facades\DB;

final readonly class RemoveProductImageAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Product $product, ProductImage $image, ?string $actorId): void
    {
        DB::transaction(function () use ($product, $image, $actorId) {
            $before = $image->only(['url', 'is_primary']);
            $image->delete();

            $this->auditLogger->log(
                action: 'product_image.removed',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                before: $before + ['image_id' => $image->id],
            );
        });
    }
}
