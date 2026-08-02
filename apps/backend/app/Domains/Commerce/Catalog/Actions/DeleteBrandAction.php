<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Brand;
use App\Domains\Commerce\Catalog\Models\Product;
use Illuminate\Support\Facades\DB;

final readonly class DeleteBrandAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Brand $brand, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($brand, $expectedVersion, $actorId) {
            $brand->assertVersionMatches($expectedVersion);

            // The products migration's brand_id foreign key is
            // nullOnDelete, but that only fires on a real row deletion —
            // Brand uses SoftDeletes, so the row never physically
            // disappears and the database-level cascade never triggers.
            // See DeleteAttributeGroupAction for the identical reasoning.
            Product::query()->where('brand_id', $brand->id)->update(['brand_id' => null]);

            $before = $brand->only(['name', 'slug']);
            $brand->delete();

            $this->auditLogger->log(
                action: 'brand.deleted',
                actorId: $actorId,
                targetType: Brand::class,
                targetId: $brand->id,
                before: $before,
            );
        });
    }
}
