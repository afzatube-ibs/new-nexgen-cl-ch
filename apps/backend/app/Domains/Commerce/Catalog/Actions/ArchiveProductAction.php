<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Events\ProductArchived;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

final readonly class ArchiveProductAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(Product $product, int $expectedVersion, ?string $actorId): Product
    {
        return DB::transaction(function () use ($product, $expectedVersion, $actorId) {
            $product->assertVersionMatches($expectedVersion);

            $before = ['status' => $product->status];
            $product->status = Product::STATUS_ARCHIVED;
            $product->save();

            $this->auditLogger->log(
                action: 'product.archived',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                before: $before,
                after: ['status' => $product->status],
            );

            $this->eventBus->publish(new ProductArchived(
                productId: $product->id,
                sku: $product->sku,
            ));

            return $product;
        });
    }
}
