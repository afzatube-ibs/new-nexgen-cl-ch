<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Support\Facades\DB;

final readonly class RestoreProductAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Product $product, ?string $actorId): Product
    {
        return DB::transaction(function () use ($product, $actorId) {
            $product->restore();

            $this->auditLogger->log(
                action: 'product.restored',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                after: $product->only(['name', 'sku']),
            );

            return $product;
        });
    }
}
