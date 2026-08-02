<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Catalog\Models\ProductRelationship;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

final readonly class AddProductRelationshipAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Product $product, string $relatedProductId, string $type, ?string $actorId): ProductRelationship
    {
        return DB::transaction(function () use ($product, $relatedProductId, $type, $actorId) {
            if ($relatedProductId === $product->id) {
                throw new InvalidArgumentException('A product cannot be related to itself.');
            }

            $relationship = $product->relationships()->create([
                'related_product_id' => $relatedProductId,
                'type' => $type,
            ]);

            $this->auditLogger->log(
                action: 'product_relationship.added',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                after: ['related_product_id' => $relatedProductId, 'type' => $type],
            );

            return $relationship;
        });
    }
}
