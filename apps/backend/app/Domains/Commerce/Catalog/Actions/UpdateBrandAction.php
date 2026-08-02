<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Brand;
use App\Domains\Commerce\Catalog\Support\SlugGenerator;
use Illuminate\Support\Facades\DB;

final readonly class UpdateBrandAction
{
    private const array TRACKED_FIELDS = ['name', 'slug', 'description', 'logo_url', 'meta_title', 'meta_description'];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Brand $brand, array $changes, int $expectedVersion, ?string $actorId): Brand
    {
        return DB::transaction(function () use ($brand, $changes, $expectedVersion, $actorId) {
            $brand->assertVersionMatches($expectedVersion);

            if (array_key_exists('slug', $changes)) {
                $changes['slug'] = SlugGenerator::unique(
                    $changes['slug'],
                    Brand::query()->whereKeyNot($brand->id),
                );
            }

            $before = $brand->only(self::TRACKED_FIELDS);
            $brand->fill($changes)->save();
            $after = $brand->only(self::TRACKED_FIELDS);

            $this->auditLogger->log(
                action: 'brand.updated',
                actorId: $actorId,
                targetType: Brand::class,
                targetId: $brand->id,
                before: $before,
                after: $after,
            );

            return $brand;
        });
    }
}
