<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\ProductVariant;
use Illuminate\Support\Facades\DB;

final readonly class ArchiveProductVariantAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(ProductVariant $variant, int $expectedVersion, ?string $actorId): ProductVariant
    {
        return DB::transaction(function () use ($variant, $expectedVersion, $actorId) {
            $variant->assertVersionMatches($expectedVersion);

            $before = ['status' => $variant->status];
            $variant->status = ProductVariant::STATUS_ARCHIVED;
            $variant->save();

            $this->auditLogger->log(
                action: 'product_variant.archived',
                actorId: $actorId,
                targetType: ProductVariant::class,
                targetId: $variant->id,
                before: $before,
                after: ['status' => $variant->status],
            );

            return $variant;
        });
    }
}
