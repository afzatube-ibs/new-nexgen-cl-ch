<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Support\Facades\DB;

final readonly class SyncProductTagsAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  list<string>  $tagIds
     */
    public function execute(Product $product, array $tagIds, ?string $actorId): Product
    {
        return DB::transaction(function () use ($product, $tagIds, $actorId) {
            $before = $product->tags()->pluck('tags.id')->all();
            $product->tags()->sync($tagIds);

            $this->auditLogger->log(
                action: 'product.tags_synced',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                before: ['tag_ids' => $before],
                after: ['tag_ids' => $tagIds],
            );

            return $product->load('tags');
        });
    }
}
