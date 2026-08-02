<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Brand;
use App\Domains\Commerce\Catalog\Support\SlugGenerator;
use Illuminate\Support\Facades\DB;

final readonly class CreateBrandAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Brand
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $attributes['slug'] = SlugGenerator::unique(
                $attributes['slug'] ?? $attributes['name'],
                Brand::query(),
            );

            $brand = Brand::query()->create($attributes);

            $this->auditLogger->log(
                action: 'brand.created',
                actorId: $actorId,
                targetType: Brand::class,
                targetId: $brand->id,
                after: $brand->only(['name', 'slug', 'description', 'logo_url', 'status']),
            );

            return $brand;
        });
    }
}
