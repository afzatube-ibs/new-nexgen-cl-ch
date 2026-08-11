<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Exceptions\DependentRecordsExistException;
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

            // Deleting a brand still assigned to a live product used to
            // silently clear it (see the removed nullOnDelete-workaround
            // comment this replaces) — never remove a product relationship
            // without the merchant explicitly acknowledging it first
            // (clear the brand from those products, or archive this brand
            // instead). Found via a Product Owner acceptance audit of
            // Phase 2.2 (2026-08-11).
            $productCount = Product::query()->where('brand_id', $brand->id)->count();
            if ($productCount > 0) {
                throw new DependentRecordsExistException(
                    Brand::class,
                    $brand->id,
                    "it is still assigned to {$productCount} product(s). Clear the brand from those products, or archive this brand instead.",
                );
            }

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
