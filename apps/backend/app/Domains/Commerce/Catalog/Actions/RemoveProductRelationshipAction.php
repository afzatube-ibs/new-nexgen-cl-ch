<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Catalog\Models\ProductRelationship;
use Illuminate\Support\Facades\DB;

final readonly class RemoveProductRelationshipAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Product $product, ProductRelationship $relationship, ?string $actorId): void
    {
        DB::transaction(function () use ($product, $relationship, $actorId) {
            $before = $relationship->only(['related_product_id', 'type']);
            $relationship->delete();

            $this->auditLogger->log(
                action: 'product_relationship.removed',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                before: $before,
            );
        });
    }
}
