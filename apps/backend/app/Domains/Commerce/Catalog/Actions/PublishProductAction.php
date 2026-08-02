<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Events\ProductUpdated;
use App\Domains\Commerce\Catalog\Exceptions\ProductNotReadyToPublishException;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

/**
 * The "Publishing workflow" requirement's transition into `active`. Kept
 * as its own Action, distinct from the generic UpdateProductAction,
 * because publishing carries a business rule generic field updates do
 * not: a product must meet a minimal completeness bar before it becomes
 * customer-visible.
 */
final readonly class PublishProductAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(Product $product, int $expectedVersion, ?string $actorId): Product
    {
        return DB::transaction(function () use ($product, $expectedVersion, $actorId) {
            $product->assertVersionMatches($expectedVersion);

            $reasons = [];
            if (trim($product->name) === '') {
                $reasons[] = 'it has no name.';
            }
            if (trim($product->sku) === '') {
                $reasons[] = 'it has no SKU.';
            }
            if (! $product->categories()->exists()) {
                $reasons[] = 'it is not assigned to at least one category.';
            }
            if ($product->isConfigurable() && ! $product->variants()->exists()) {
                $reasons[] = 'it is a configurable product with no variants.';
            }

            if ($reasons !== []) {
                throw new ProductNotReadyToPublishException($product->id, $reasons);
            }

            $before = ['status' => $product->status, 'published_at' => $product->published_at?->toIso8601String()];
            $product->status = Product::STATUS_ACTIVE;
            $product->published_at = now();
            $product->save();

            $this->auditLogger->log(
                action: 'product.published',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                before: $before,
                after: ['status' => $product->status, 'published_at' => $product->published_at->toIso8601String()],
            );

            $this->eventBus->publish(new ProductUpdated(
                productId: $product->id,
                sku: $product->sku,
                status: $product->status,
            ));

            return $product;
        });
    }
}
