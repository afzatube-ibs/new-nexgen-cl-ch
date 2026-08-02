<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\ProductVariant;
use Illuminate\Support\Facades\DB;

final readonly class UpdateProductVariantAction
{
    private const array TRACKED_FIELDS = ['sku', 'barcode', 'position'];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(ProductVariant $variant, array $changes, int $expectedVersion, ?string $actorId): ProductVariant
    {
        return DB::transaction(function () use ($variant, $changes, $expectedVersion, $actorId) {
            $variant->assertVersionMatches($expectedVersion);

            $before = $variant->only(self::TRACKED_FIELDS);
            $variant->fill($changes)->save();
            $after = $variant->only(self::TRACKED_FIELDS);

            $this->auditLogger->log(
                action: 'product_variant.updated',
                actorId: $actorId,
                targetType: ProductVariant::class,
                targetId: $variant->id,
                before: $before,
                after: $after,
            );

            return $variant;
        });
    }
}
