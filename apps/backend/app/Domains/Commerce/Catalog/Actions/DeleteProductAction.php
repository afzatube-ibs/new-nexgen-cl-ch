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
