<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Support\Facades\DB;

final readonly class DeleteProductAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Product $product, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($product, $expectedVersion, $actorId) {
            $product->assertVersionMatches($expectedVersion);

            $product->categories()->detach();
            $product->collections()->detach();
            $product->tags()->detach();
            $product->options()->detach();

            $before = $product->only(['name', 'sku']);

            // Free the SKU for reuse — see `DeleteProductVariantAction`'s
            // identical fix (same audit, same reasoning: `Product` also
            // uses SoftDeletes over a physical unique index that can't
            // exclude soft-deleted rows on this platform's chosen engine,
            // and needs its own explicit `save()` for the same reason —
            // `SoftDeletes::delete()` only persists `deleted_at`).
            $product->sku = mb_substr($product->sku, 0, 54).'--deleted-'.$product->id;
            $product->save();
            $product->delete();

            $this->auditLogger->log(
                action: 'product.deleted',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                before: $before,
            );
        });
    }
}
