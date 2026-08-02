<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Actions;

use App\Domains\Commerce\Inventory\Audit\AuditLogger;
use App\Domains\Commerce\Inventory\Exceptions\DependentRecordsExistException;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use Illuminate\Support\Facades\DB;

final readonly class DeleteWarehouseAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Warehouse $warehouse, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($warehouse, $expectedVersion, $actorId) {
            $warehouse->assertVersionMatches($expectedVersion);

            if ($warehouse->stockItems()->exists()) {
                throw new DependentRecordsExistException(
                    Warehouse::class,
                    $warehouse->id,
                    'it still has stock items recorded against it.',
                );
            }

            $before = $warehouse->only(['code', 'name']);
            $warehouse->delete();

            $this->auditLogger->log(
                action: 'warehouse.deleted',
                actorId: $actorId,
                targetType: Warehouse::class,
                targetId: $warehouse->id,
                before: $before,
            );
        });
    }
}
