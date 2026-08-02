<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Brand;
use Illuminate\Support\Facades\DB;

final readonly class ArchiveBrandAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Brand $brand, int $expectedVersion, ?string $actorId): Brand
    {
        return DB::transaction(function () use ($brand, $expectedVersion, $actorId) {
            $brand->assertVersionMatches($expectedVersion);

            $before = ['status' => $brand->status];
            $brand->status = Brand::STATUS_ARCHIVED;
            $brand->save();

            $this->auditLogger->log(
                action: 'brand.archived',
                actorId: $actorId,
                targetType: Brand::class,
                targetId: $brand->id,
                before: $before,
                after: ['status' => $brand->status],
            );

            return $brand;
        });
    }
}
