<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Support\Facades\DB;

/**
 * Sets which Options define a `configurable` Product's variant dimensions
 * (product_options — see that migration's docblock). Deliberately
 * independent of ProductAttributeValue's typed-fact concept.
 */
final readonly class SyncProductOptionsAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  list<string>  $optionIds
     */
    public function execute(Product $product, array $optionIds, ?string $actorId): Product
    {
        return DB::transaction(function () use ($product, $optionIds, $actorId) {
            $before = $product->options()->pluck('options.id')->all();
            $product->options()->sync($optionIds);

            $this->auditLogger->log(
                action: 'product.options_synced',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                before: ['option_ids' => $before],
                after: ['option_ids' => $optionIds],
            );

            return $product->load('options');
        });
    }
}
