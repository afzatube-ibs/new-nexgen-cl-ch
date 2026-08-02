<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Brand;
use Illuminate\Support\Facades\DB;

final readonly class RestoreBrandAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Brand $brand, ?string $actorId): Brand
    {
        return DB::transaction(function () use ($brand, $actorId) {
            $brand->restore();

            $this->auditLogger->log(
                action: 'brand.restored',
                actorId: $actorId,
                targetType: Brand::class,
                targetId: $brand->id,
                after: $brand->only(['name', 'slug']),
            );

            return $brand;
        });
    }
}
