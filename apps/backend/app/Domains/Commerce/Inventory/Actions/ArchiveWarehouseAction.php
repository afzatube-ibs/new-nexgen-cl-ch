<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Actions;

use App\Domains\Commerce\Inventory\Audit\AuditLogger;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use Illuminate\Support\Facades\DB;

final readonly class ArchiveWarehouseAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Warehouse $warehouse, int $expectedVersion, ?string $actorId): Warehouse
    {
        return DB::transaction(function () use ($warehouse, $expectedVersion, $actorId) {
            $warehouse->assertVersionMatches($expectedVersion);

            $before = ['status' => $warehouse->status];
            $warehouse->status = Warehouse::STATUS_ARCHIVED;
            $warehouse->save();

            $this->auditLogger->log(
                action: 'warehouse.archived',
                actorId: $actorId,
                targetType: Warehouse::class,
                targetId: $warehouse->id,
                before: $before,
                after: ['status' => $warehouse->status],
            );

            return $warehouse;
        });
    }
}
