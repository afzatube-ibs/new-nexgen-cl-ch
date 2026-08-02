<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Events\ProductCreated;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Catalog\Support\SlugGenerator;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

final readonly class CreateProductAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Product
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $attributes['slug'] = SlugGenerator::unique(
                $attributes['slug'] ?? $attributes['name'],
                Product::query(),
            );

            $product = Product::query()->create($attributes);

            $this->auditLogger->log(
                action: 'product.created',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                after: $product->only([
                    'brand_id', 'sku', 'barcode', 'name', 'slug', 'product_type', 'status', 'visibility',
                ]),
            );

            $this->eventBus->publish(new ProductCreated(
                productId: $product->id,
                sku: $product->sku,
                status: $product->status,
            ));

            return $product;
        });
    }
}
