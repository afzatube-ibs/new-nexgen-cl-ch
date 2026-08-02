<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Events\VariantAdded;
use App\Domains\Commerce\Catalog\Exceptions\InvalidVariantException;
use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Catalog\Models\ProductVariant;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Support\Facades\DB;

final readonly class AddProductVariantAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes  sku, barcode?, position?
     * @param  list<string>  $optionValueIds
     */
    public function execute(Product $product, array $attributes, array $optionValueIds, ?string $actorId): ProductVariant
    {
        return DB::transaction(function () use ($product, $attributes, $optionValueIds, $actorId) {
            if (! $product->isConfigurable()) {
                throw new InvalidVariantException("Product [{$product->id}] is not configurable and cannot have variants.");
            }

            $productOptionIds = $product->options()->pluck('options.id')->all();
            $ownedOptionValueCount = DB::table('option_values')
                ->whereIn('id', $optionValueIds)
                ->whereIn('option_id', $productOptionIds)
                ->count();

            if ($ownedOptionValueCount !== count($optionValueIds)) {
                throw new InvalidVariantException(
                    "One or more option values are not declared as a variant dimension for product [{$product->id}]."
                );
            }

            if ($this->combinationAlreadyExists($product, $optionValueIds)) {
                throw new InvalidVariantException(
                    "A variant with this exact option value combination already exists for product [{$product->id}]."
                );
            }

            $variant = $product->variants()->create($attributes);
            $variant->optionValues()->attach($optionValueIds);

            $this->auditLogger->log(
                action: 'product_variant.added',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                after: ['variant_id' => $variant->id, 'sku' => $variant->sku, 'option_value_ids' => $optionValueIds],
            );

            $this->eventBus->publish(new VariantAdded(
                productId: $product->id,
                variantId: $variant->id,
                sku: $variant->sku,
            ));

            return $variant->load('optionValues');
        });
    }

    /**
     * @param  list<string>  $optionValueIds
     */
    private function combinationAlreadyExists(Product $product, array $optionValueIds): bool
    {
        sort($optionValueIds);

        foreach ($product->variants()->with('optionValues')->get() as $variant) {
            $existingIds = $variant->optionValues->pluck('id')->all();
            sort($existingIds);

            if ($existingIds === $optionValueIds) {
                return true;
            }
        }

        return false;
    }
}
