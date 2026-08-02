<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Attribute;
use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Bulk-sets a Product's Attribute values (the "Product Metadata"/typed-
 * attribute surface — see the attributes migration's docblock for the
 * distinction from the free-form `metadata` JSON column). Part of
 * Product's aggregate, versioned via the parent Product's expected_version
 * per DATA:AGGREGATE_BOUNDARIES.
 */
final readonly class SetProductAttributeValuesAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, string|null>  $values  Attribute id => value.
     */
    public function execute(Product $product, array $values, int $expectedVersion, ?string $actorId): Product
    {
        return DB::transaction(function () use ($product, $values, $expectedVersion, $actorId) {
            $product->assertVersionMatches($expectedVersion);

            $validAttributeIds = Attribute::query()->whereIn('id', array_keys($values))->pluck('id')->all();
            if (count($validAttributeIds) !== count($values)) {
                throw new InvalidArgumentException('One or more attribute ids do not exist.');
            }

            $before = $product->attributeValues()->pluck('value', 'attribute_id')->all();

            foreach ($values as $attributeId => $value) {
                $product->attributeValues()->updateOrCreate(
                    ['attribute_id' => $attributeId],
                    ['value' => $value],
                );
            }

            $after = $product->attributeValues()->pluck('value', 'attribute_id')->all();

            $this->auditLogger->log(
                action: 'product.attribute_values_set',
                actorId: $actorId,
                targetType: Product::class,
                targetId: $product->id,
                before: $before,
                after: $after,
            );

            return $product;
        });
    }
}
