<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Events\ProductUpdated;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Catalog\Support\SlugGenerator;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

final readonly class UpdateProductAction
{
    private const array TRACKED_FIELDS = [
        'brand_id', 'sku', 'barcode', 'name', 'slug', 'description', 'short_description',
        'product_type', 'visibility', 'meta_title', 'meta_description', 'meta_keywords', 'metadata',
    ];

    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Product $product, array $changes, int $expectedVersion, ?string $actorId): Product
    {
        return DB::transaction(function () use ($product, $changes, $expectedVersion, $actorId) {
            $product->assertVersionMatches($expectedVersion);

            if (array_key_exists('slug', $changes)) {
                $changes['slug'] = SlugGenerator::unique(
                    $changes['slug'],
                    Product::query()->whereKeyNot($product->id),
                );
            }

            $before = $product->only(self::TRACKED_FIELDS);
            $product->fill($changes)->save();
            $after = $product->only(self::TRACKED_FIELDS);

            $this->auditLogger->log(
                action: 'product.updated',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                before: $before,
                after: $after,
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
