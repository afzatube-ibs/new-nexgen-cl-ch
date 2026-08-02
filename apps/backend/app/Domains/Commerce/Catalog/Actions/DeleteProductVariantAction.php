<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\ProductVariant;
use Illuminate\Support\Facades\DB;

final readonly class DeleteProductVariantAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(ProductVariant $variant, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($variant, $expectedVersion, $actorId) {
            $variant->assertVersionMatches($expectedVersion);

            $before = $variant->only(['sku']);
            $variant->optionValues()->detach();
            $variant->delete();

            $this->auditLogger->log(
                action: 'product_variant.deleted',
                actorId: $actorId,
                targetType: ProductVariant::class,
                targetId: $variant->id,
                before: $before,
            );
        });
    }
}
