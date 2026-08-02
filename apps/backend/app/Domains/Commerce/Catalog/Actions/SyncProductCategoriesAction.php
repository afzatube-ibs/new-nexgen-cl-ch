<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Support\Facades\DB;

final readonly class SyncProductCategoriesAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  list<string>  $categoryIds
     */
    public function execute(Product $product, array $categoryIds, ?string $actorId): Product
    {
        return DB::transaction(function () use ($product, $categoryIds, $actorId) {
            $before = $product->categories()->pluck('categories.id')->all();
            $product->categories()->sync($categoryIds);
            $after = $categoryIds;

            $this->auditLogger->log(
                action: 'product.categories_synced',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                before: ['category_ids' => $before],
                after: ['category_ids' => $after],
            );

            return $product->load('categories');
        });
    }
}
