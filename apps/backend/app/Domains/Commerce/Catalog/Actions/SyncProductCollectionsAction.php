<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Support\Facades\DB;

final readonly class SyncProductCollectionsAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  list<string>  $collectionIds
     */
    public function execute(Product $product, array $collectionIds, ?string $actorId): Product
    {
        return DB::transaction(function () use ($product, $collectionIds, $actorId) {
            $before = $product->collections()->pluck('collections.id')->all();
            $product->collections()->sync($collectionIds);

            $this->auditLogger->log(
                action: 'product.collections_synced',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                before: ['collection_ids' => $before],
                after: ['collection_ids' => $collectionIds],
            );

            return $product->load('collections');
        });
    }
}
